// Import Firebase configuration
import firebaseConfig from './firebase-config.js';

// Import Firebase modules
import { initializeApp } from 'firebase/app';
import { getAnalytics, logEvent } from 'firebase/analytics';

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);

// Function to track events using Firebase Analytics SDK
function trackEvent(eventName, eventParams = {}) {
  // Get the user ID
  ensureUserId().then(userId => {
    // Add user ID to params
    const enhancedParams = {
      ...eventParams,
      user_id: userId
    };
    
    // Log the event using Firebase SDK
    try {
      logEvent(analytics, eventName, enhancedParams);
      console.log(`Event logged: ${eventName}`, enhancedParams);
    } catch (error) {
      console.error(`Error logging event ${eventName}:`, error);
    }
  });
}

// Generate a unique user ID if not already set
function ensureUserId() {
  return new Promise((resolve) => {
    chrome.storage.local.get(['userId'], function(result) {
      if (result.userId) {
        resolve(result.userId);
      } else {
        // Generate a random ID
        const userId = 'user_' + Math.random().toString(36).substring(2, 15);
        chrome.storage.local.set({userId: userId});
        resolve(userId);
      }
    });
  });
}

// Initialize analytics on installation
chrome.runtime.onInstalled.addListener(async function() {
  // Set up user ID
  try {
    const userId = await ensureUserId();
    
    // Log installation event
    trackEvent('extension_installed', {
      extension_version: chrome.runtime.getManifest().version
    });
  } catch (error) {
    console.error('Error in onInstalled handler:', error);
  }
  
  // Initialize local analytics data for the dashboard
  chrome.storage.local.set({
    installDate: new Date().toISOString(),
    usageStats: {
      transcriptFetches: 0,
      searches: 0,
      timestampClicks: 0,
      translations: 0,
      videosAccessed: []
    }
  });
});



// Listen for messages from content scripts and popup
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
  if (request.action === 'contentScriptLoaded') {
    // Log page view
    if (sender.tab && sender.tab.url && sender.tab.url.includes('youtube.com/watch')) {
      const videoId = new URL(sender.tab.url).searchParams.get('v');
      if (videoId) {
        trackEvent('page_view', {
          page_title: 'YouTube Video',
          page_location: sender.tab.url,
          video_id: videoId
        });
      }
    }
    sendResponse({success: true});
  } else if (request.action === 'trackEvent') {
    // Track both locally and with our tracking function
    try {
      // Always track locally
      trackLocalEvent(request.eventType, request.eventData);
      
      // Track with our tracking function
      trackEvent(mapEventName(request.eventType), request.eventData);
      
      sendResponse({success: true});
    } catch (error) {
      console.error('Error tracking event:', error);
      sendResponse({success: false, error: error.message});
    }
  } else if (request.action === 'getAnalytics') {
    getLocalAnalytics().then(data => {
      sendResponse({success: true, data: data});
    }).catch(error => {
      console.error('Error getting analytics:', error);
      sendResponse({success: false, error: error.message});
    });
    return true; // Required for async response
  }
});

// Map our event types to standardized event names
function mapEventName(eventType) {
  switch(eventType) {
    case 'transcriptFetch':
      return 'transcript_fetch';
    case 'search':
      return 'search';
    case 'timestampClick':
      return 'timestamp_click';
    case 'translation':
      return 'transcript_translation';
    default:
      return eventType;
  }
}

// Track events locally for the dashboard
function trackLocalEvent(eventType, eventData) {
  chrome.storage.local.get(['usageStats'], function(result) {
    const stats = result.usageStats || {
      transcriptFetches: 0,
      searches: 0,
      timestampClicks: 0,
      translations: 0,
      videosAccessed: []
    };
    
    // Update stats based on event type
    switch(eventType) {
      case 'transcriptFetch':
        stats.transcriptFetches++;
        // Add video ID to accessed videos if not already there
        if (eventData.videoId && !stats.videosAccessed.includes(eventData.videoId)) {
          stats.videosAccessed.push(eventData.videoId);
        }
        break;
      case 'search':
        stats.searches++;
        break;
      case 'timestampClick':
        stats.timestampClicks++;
        break;
      case 'translation':
        stats.translations = stats.translations || 0;
        stats.translations++;
        break;
    }
    
    // Save updated stats
    chrome.storage.local.set({usageStats: stats});
  });
}

// Get local analytics data for the dashboard
async function getLocalAnalytics() {
  return new Promise((resolve) => {
    chrome.storage.local.get(['installDate', 'usageStats', 'userId'], function(result) {
      resolve({
        userId: result.userId || 'Unknown',
        installDate: result.installDate,
        usageStats: result.usageStats || {
          transcriptFetches: 0,
          searches: 0,
          timestampClicks: 0,
          translations: 0,
          videosAccessed: []
        },
        uniqueVideos: result.usageStats ? result.usageStats.videosAccessed.length : 0,
        daysSinceInstall: result.installDate ? 
          Math.floor((new Date() - new Date(result.installDate)) / (1000 * 60 * 60 * 24)) : 0
      });
    });
  });
}
