document.addEventListener('DOMContentLoaded', function() {
  const transcribeBtn = document.getElementById('transcribe-btn');
  const searchBtn = document.getElementById('search-btn');
  const searchInput = document.getElementById('search-input');
  const statusElement = document.getElementById('status');
  const controlsElement = document.getElementById('controls');
  const searchContainer = document.getElementById('search-container');
  const resultsContainer = document.getElementById('results-container');
  const resultsList = document.getElementById('results-list');
  const transcriptContainer = document.getElementById('transcript-container');
  const transcriptText = document.getElementById('transcript-text');
  
  // Analytics data is still being collected in the background
  
  // Check if we're on a YouTube video page
  chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
    const currentTab = tabs[0];
    if (currentTab.url && currentTab.url.includes('youtube.com/watch')) {
      // Check if content script is loaded by sending a ping
      chrome.tabs.sendMessage(tabs[0].id, {action: 'ping'}, function(response) {
        if (chrome.runtime.lastError) {
          // Content script not loaded
          statusElement.textContent = 'Please refresh the YouTube page to activate the extension.';
          return;
        }
        
        // Content script is loaded - automatically start transcription
        statusElement.textContent = 'Fetching video captions... This may take a moment.';
        controlsElement.classList.remove('hidden');
        
        // Automatically transcribe the video
        transcribeVideo(tabs[0].id);
      });
    } else {
      statusElement.textContent = 'Navigate to a YouTube video to use this extension.';
    }
  });
  
  // Function to transcribe the video
  function transcribeVideo(tabId) {
    chrome.tabs.sendMessage(tabId, {action: 'transcribe'}, function(response) {
      if (chrome.runtime.lastError) {
        statusElement.textContent = 'Error: Please refresh the YouTube page and try again.';
        return;
      }
      
      if (response && response.success) {
        statusElement.textContent = 'Transcription complete!';
        searchContainer.classList.remove('hidden');
        

        
        // Store transcript in local storage for search
        chrome.storage.local.set({
          currentTranscript: response.transcript,
          currentTranscriptSegments: response.segments
        });
        
        // Display the transcript
        displayTranscript(response.transcript, response.segments);
      } else {
        statusElement.textContent = 'Error transcribing video: ' + (response ? response.error : 'Unknown error');
      }
    });
  }
  
  // Handle search button click
  searchBtn.addEventListener('click', function() {
    const searchTerm = searchInput.value.trim().toLowerCase();
    if (!searchTerm) return;
    
    // Track search event
    chrome.runtime.sendMessage({
      action: 'trackEvent',
      eventType: 'search',
      eventData: { term: searchTerm }
    });
    
    chrome.storage.local.get(['currentTranscript', 'currentTranscriptSegments'], function(data) {
      if (!data.currentTranscript || !data.currentTranscriptSegments) {
        statusElement.textContent = 'No transcript available. Please transcribe the video first.';
        return;
      }
      
      const results = searchInTranscript(searchTerm, data.currentTranscript, data.currentTranscriptSegments);
      displaySearchResults(results);
    });
  });
  
  // Search in transcript function
  function searchInTranscript(term, transcript, segments) {
    const results = [];
    const lowerTranscript = transcript.toLowerCase();
    let startIndex = 0;
    let index;
    
    while ((index = lowerTranscript.indexOf(term, startIndex)) !== -1) {
      // Find which segment this occurrence belongs to
      const segmentIndex = findSegmentForPosition(index, segments);
      if (segmentIndex !== -1) {
        const segment = segments[segmentIndex];
        const contextStart = Math.max(0, index - 50);
        const contextEnd = Math.min(lowerTranscript.length, index + term.length + 50);
        
        // Get context with the search term highlighted
        let context = transcript.substring(contextStart, contextEnd);
        const termStartInContext = index - contextStart;
        const termEndInContext = termStartInContext + term.length;
        
        // Create result object
        results.push({
          timestamp: segment.start,
          formattedTime: formatTime(segment.start),
          context: context,
          termStart: termStartInContext,
          termEnd: termEndInContext
        });
      }
      
      startIndex = index + term.length;
    }
    
    return results;
  }
  
  // Find which segment a position in the transcript belongs to
  function findSegmentForPosition(position, segments) {
    let charCount = 0;
    for (let i = 0; i < segments.length; i++) {
      charCount += segments[i].text.length;
      if (position < charCount) {
        return i;
      }
    }
    return -1;
  }
  
  // Display search results
  function displaySearchResults(results) {
    resultsList.innerHTML = '';
    
    if (results.length === 0) {
      resultsList.innerHTML = '<li>No results found</li>';
    } else {
      results.forEach(result => {
        const li = document.createElement('li');
        
        // Create context with highlighted term
        const beforeTerm = result.context.substring(0, result.termStart);
        const term = result.context.substring(result.termStart, result.termEnd);
        const afterTerm = result.context.substring(result.termEnd);
        
        li.innerHTML = `
          <span class="timestamp">${result.formattedTime}</span>: 
          ${beforeTerm}<strong>${term}</strong>${afterTerm}
        `;
        
        li.addEventListener('click', function() {
          seekToTimestamp(result.timestamp);
        });
        
        resultsList.appendChild(li);
      });
    }
    
    resultsContainer.classList.remove('hidden');
  }
  
  // Display full transcript
  function displayTranscript(transcript, segments) {
    transcriptText.innerHTML = '';
    
    segments.forEach(segment => {
      const p = document.createElement('p');
      p.innerHTML = `<span class="timestamp">${formatTime(segment.start)}</span>: ${segment.text}`;
      
      // Add click event to timestamp to seek video
      p.querySelector('.timestamp').addEventListener('click', function() {
        seekToTimestamp(segment.start);
      });
      
      transcriptText.appendChild(p);
    });
    
    transcriptContainer.classList.remove('hidden');
  }
  
  // Seek to timestamp in the YouTube video
  function seekToTimestamp(seconds) {
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
      chrome.tabs.sendMessage(tabs[0].id, {
        action: 'seek',
        timestamp: seconds
      });
    });
  }
  
  // Format seconds to MM:SS
  function formatTime(seconds) {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  }
  
  // Add event listener for Enter key in search input
  searchInput.addEventListener('keyup', function(event) {
    if (event.key === 'Enter') {
      searchBtn.click();
    }
  });
  

});
