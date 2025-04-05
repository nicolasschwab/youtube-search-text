// Comprehensive test script for all Firebase Analytics events
import firebaseConfig from './firebase-config.js';
import firebaseSecrets from './firebase-secrets.js';

// Function to send a test event using the Measurement Protocol
async function sendTestEvent(eventName, eventParams = {}) {
  console.log(`Testing event: ${eventName}`, eventParams);
  
  // Generate a test client ID
  const clientId = 'test_user_' + Math.random().toString(36).substring(2, 15);
  
  // Create event data
  const eventData = {
    client_id: clientId,
    non_personalized_ads: false,
    events: [{
      name: eventName,
      params: {
        ...eventParams,
        engagement_time_msec: 100,
        session_id: clientId.substring(0, 10),
        test_mode: true
      }
    }]
  };
  
  // URLs for debug and production endpoints
  const measurementId = firebaseConfig.measurementId;
  const apiSecret = firebaseSecrets.measurementProtocolSecret;
  const debugUrl = `https://www.google-analytics.com/debug/mp/collect?measurement_id=${measurementId}&api_secret=${apiSecret}`;
  const prodUrl = `https://www.google-analytics.com/mp/collect?measurement_id=${measurementId}&api_secret=${apiSecret}`;
  
  console.log(`Sending ${eventName} to debug endpoint...`);
  
  try {
    // First validate with debug endpoint
    const debugResponse = await fetch(debugUrl, {
      method: 'POST',
      body: JSON.stringify(eventData)
    });
    
    const debugText = await debugResponse.text();
    let validationPassed = false;
    
    try {
      const debugData = JSON.parse(debugText);
      console.log(`Debug response for ${eventName}:`, debugData);
      
      if (debugData.validationMessages && debugData.validationMessages.length > 0) {
        console.warn(`Validation issues for ${eventName}:`, debugData.validationMessages);
      } else {
        console.log(`Event ${eventName} validated successfully`);
        validationPassed = true;
      }
    } catch (e) {
      console.log(`Raw debug response for ${eventName}:`, debugText);
      validationPassed = debugResponse.status === 200 || debugResponse.status === 204;
    }
    
    // If validation passed, send to production endpoint
    if (validationPassed) {
      console.log(`Sending ${eventName} to production endpoint...`);
      
      const prodResponse = await fetch(prodUrl, {
        method: 'POST',
        body: JSON.stringify(eventData)
      });
      
      console.log(`Production response status for ${eventName}:`, prodResponse.status);
      
      return {
        success: true,
        eventName,
        debugStatus: debugResponse.status,
        prodStatus: prodResponse.status
      };
    } else {
      return {
        success: false,
        eventName,
        error: 'Validation failed',
        debugStatus: debugResponse.status
      };
    }
  } catch (error) {
    console.error(`Error sending ${eventName}:`, error);
    return {
      success: false,
      eventName,
      error: error.message
    };
  }
}

// Test all events used in the extension
async function testAllEvents() {
  console.log('Starting comprehensive test of all analytics events...');
  
  const results = [];
  
  // Test installation event
  results.push(await sendTestEvent('extension_installed', {
    extension_version: '1.0.0'
  }));
  
  // Test page view event
  results.push(await sendTestEvent('page_view', {
    page_title: 'YouTube Video',
    page_location: 'https://www.youtube.com/watch?v=test123',
    video_id: 'test123'
  }));
  
  // Test transcript fetch event
  results.push(await sendTestEvent('transcript_fetch', {
    videoId: 'test123'
  }));
  
  // Test search event
  results.push(await sendTestEvent('search', {
    term: 'test search'
  }));
  
  // Test timestamp click event
  results.push(await sendTestEvent('timestamp_click', {
    timestamp: 120
  }));
  
  // Test translation event
  results.push(await sendTestEvent('transcript_translation', {
    language: 'es'
  }));
  
  // Print summary
  console.log('\n--- TEST RESULTS SUMMARY ---');
  let allSuccessful = true;
  
  results.forEach(result => {
    const status = result.success ? '✅ PASSED' : '❌ FAILED';
    console.log(`${status}: ${result.eventName}`);
    if (!result.success) {
      allSuccessful = false;
      console.log(`  Error: ${result.error}`);
    }
  });
  
  console.log(`\nOverall test ${allSuccessful ? 'PASSED' : 'FAILED'}`);
  console.log('Check your Firebase Analytics dashboard in a few hours to see if events are appearing.');
  console.log('Note: Some reports may take up to 24-48 hours to fully populate.');
  
  return {
    success: allSuccessful,
    results
  };
}

// Run the tests
testAllEvents().then(result => {
  console.log('All tests completed with result:', result.success ? 'SUCCESS' : 'FAILURE');
});

// Export for use in other files
export { sendTestEvent, testAllEvents };
