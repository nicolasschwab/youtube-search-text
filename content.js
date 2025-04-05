// Listen for messages from the popup
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
  if (request.action === 'ping') {
    // Respond to ping to confirm content script is loaded
    sendResponse({success: true});
    return;
  } else if (request.action === 'transcribe') {
    getVideoTranscript()
      .then(result => {
        sendResponse({
          success: true,
          transcript: result.transcript,
          segments: result.segments
        });
      })
      .catch(error => {
        console.error('Transcription error:', error);
        sendResponse({
          success: false,
          error: error.message || 'Unknown error occurred'
        });
      });
    return true; // Required to use sendResponse asynchronously

  } else if (request.action === 'seek') {
    seekToTimestamp(request.timestamp);
    sendResponse({success: true});
  }
});

// Function to get the video transcript using YouTube API
async function getVideoTranscript() {
  try {
    // Extract video ID from URL
    const videoId = extractVideoId(window.location.href);
    if (!videoId) {
      throw new Error('Could not extract video ID from URL');
    }
    
    // Get available caption tracks
    const captionTracks = await getCaptionTracks(videoId);
    
    if (captionTracks.length === 0) {
      throw new Error('No caption tracks available for this video');
    }
    
    // Prefer English captions if available, otherwise use the first available track
    let selectedTrack = captionTracks.find(track => track.language_code === 'en') || captionTracks[0];
    
    // Get the caption track content
    const captionContent = await getCaptionContent(selectedTrack.baseUrl);
    
    // Parse the caption content into segments with timestamps
    const segments = parseCaptionContent(captionContent);
    
    // Create a full transcript from the segments
    let fullTranscript = segments.map(segment => segment.text).join(' ');
    
    // Track this transcript fetch
    chrome.runtime.sendMessage({
      action: 'trackEvent',
      eventType: 'transcriptFetch',
      eventData: { videoId: videoId }
    });
    
    return {
      transcript: fullTranscript,
      segments: segments
    };
  } catch (error) {
    console.error('Error getting video transcript:', error);
    throw error;
  }
}

// Extract video ID from YouTube URL
function extractVideoId(url) {
  const urlObj = new URL(url);
  const searchParams = new URLSearchParams(urlObj.search);
  return searchParams.get('v');
}

// Get available caption tracks for a video
async function getCaptionTracks(videoId) {
  try {
    // Get the video page content
    const response = await fetch(`https://www.youtube.com/watch?v=${videoId}`);
    const html = await response.text();
    
    // Extract the ytInitialPlayerResponse from the page
    const playerResponseMatch = html.match(/ytInitialPlayerResponse\s*=\s*(\{.+?\})\s*;/);
    if (!playerResponseMatch || !playerResponseMatch[1]) {
      throw new Error('Could not find player response data');
    }
    
    // Parse the player response
    const playerResponse = JSON.parse(playerResponseMatch[1]);
    
    // Extract caption tracks
    const captionTracks = [];
    if (playerResponse.captions && 
        playerResponse.captions.playerCaptionsTracklistRenderer && 
        playerResponse.captions.playerCaptionsTracklistRenderer.captionTracks) {
      return playerResponse.captions.playerCaptionsTracklistRenderer.captionTracks;
    }
    
    return captionTracks;
  } catch (error) {
    console.error('Error getting caption tracks:', error);
    return [];
  }
}

// Get caption content from a caption track URL
async function getCaptionContent(captionUrl) {
  try {
    const response = await fetch(captionUrl);
    const content = await response.text();
    return content;
  } catch (error) {
    console.error('Error getting caption content:', error);
    throw error;
  }
}

// Parse caption content (XML format) into segments with timestamps
function parseCaptionContent(content) {
  const segments = [];
  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(content, 'text/xml');
  
  const textElements = xmlDoc.getElementsByTagName('text');
  
  for (let i = 0; i < textElements.length; i++) {
    const textElement = textElements[i];
    const start = parseFloat(textElement.getAttribute('start'));
    const duration = parseFloat(textElement.getAttribute('dur') || '0');
    const text = textElement.textContent.trim();
    
    if (text) {
      segments.push({
        start: start,
        end: start + duration,
        text: text
      });
    }
  }
  
  return segments;
}

// Function to seek to a specific timestamp in the video
function seekToTimestamp(seconds) {
  const videoElement = document.querySelector('video');
  if (videoElement) {
    videoElement.currentTime = seconds;
    videoElement.play().catch(error => {
      console.error('Error playing video:', error);
    });
    
    // Track timestamp click
    chrome.runtime.sendMessage({
      action: 'trackEvent',
      eventType: 'timestampClick',
      eventData: { timestamp: seconds }
    });
  }
}



// Notify the background script that the content script has loaded
chrome.runtime.sendMessage({action: 'contentScriptLoaded'});
