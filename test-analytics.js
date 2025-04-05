// Test script for Firebase Analytics events
import firebaseConfig from './firebase-config.js';
import firebaseSecrets from './firebase-secrets.js';

// Function to test the Measurement Protocol implementation
async function testMeasurementProtocol() {
  console.log('Testing Firebase Analytics via Measurement Protocol...');
  
  // Generate a test client ID
  const clientId = 'test_user_' + Math.random().toString(36).substring(2, 15);
  
  // Create test event data
  const eventData = {
    client_id: clientId,
    non_personalized_ads: false,
    events: [{
      name: 'test_event',
      params: {
        test_param: 'test_value',
        engagement_time_msec: 100,
        session_id: clientId.substring(0, 10)
      }
    }]
  };
  
  // Use debug endpoint to see immediate results
  const measurementId = firebaseConfig.measurementId;
  const apiSecret = firebaseSecrets.measurementProtocolSecret;
  const url = `https://www.google-analytics.com/debug/mp/collect?measurement_id=${measurementId}&api_secret=${apiSecret}`;
  
  console.log('Sending test event to:', url);
  console.log('Event data:', JSON.stringify(eventData, null, 2));
  
  try {
    const response = await fetch(url, {
      method: 'POST',
      body: JSON.stringify(eventData)
    });
    
    const responseText = await response.text();
    console.log('Response status:', response.status);
    
    try {
      const responseData = JSON.parse(responseText);
      console.log('Response data:', JSON.stringify(responseData, null, 2));
      
      // Check for validation messages
      if (responseData.validationMessages && responseData.validationMessages.length > 0) {
        console.warn('Validation issues:', responseData.validationMessages);
        return {
          success: false,
          message: 'Event sent but has validation issues',
          details: responseData.validationMessages
        };
      } else {
        console.log('Event validated successfully!');
        return {
          success: true,
          message: 'Event sent and validated successfully'
        };
      }
    } catch (e) {
      console.log('Raw response:', responseText);
      return {
        success: response.status === 200 || response.status === 204,
        message: 'Event sent, but response could not be parsed',
        rawResponse: responseText
      };
    }
  } catch (error) {
    console.error('Error sending test event:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

// Run the test
testMeasurementProtocol().then(result => {
  console.log('Test completed with result:', result);
});

// Export for use in other files
export { testMeasurementProtocol };
