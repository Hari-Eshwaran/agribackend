const fetch = require('node-fetch');

async function testVoiceAPI() {
    try {
        console.log('Testing voice alert API...');
        
        const response = await fetch('http://localhost:3002/api/voice-alerts/send', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                message: 'This is a test message from the API test',
                targetNumber: '+918056129665',
                language: 'en-US',
                settings: {
                    voiceSpeed: 'normal',
                    retryAttempts: 1
                }
            })
        });

        const result = await response.json();
        console.log('Response status:', response.status);
        console.log('Response body:', result);

        if (response.ok) {
            console.log('✅ Voice alert API test successful!');
        } else {
            console.log('❌ Voice alert API test failed!');
        }
    } catch (error) {
        console.error('Error testing API:', error);
    }
}

testVoiceAPI();