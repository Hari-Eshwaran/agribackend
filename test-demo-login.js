const fetch = require('node-fetch');

async function testDemoLogin() {
    try {
        console.log('Testing demo login API...');
        
        const response = await fetch('http://localhost:3002/api/auth/demo-login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                username: 'admin_agri',
                password: 'AgriAdmin@2024',
                role: 'admin'
            })
        });

        const result = await response.json();
        console.log('Response status:', response.status);
        console.log('Response body:', result);

        if (response.ok && result.accessToken) {
            console.log('✅ Demo login successful!');
            console.log('Access token received:', result.accessToken.substring(0, 20) + '...');
            
            // Test voice alert with the token
            console.log('\nTesting voice alert with token...');
            const voiceResponse = await fetch('http://localhost:3002/api/voice-alerts/send', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${result.accessToken}`
                },
                body: JSON.stringify({
                    message: 'Test message from authenticated demo user',
                    targetNumber: '+918056129665',
                    language: 'en-US',
                    settings: {
                        voiceSpeed: 'normal',
                        retryAttempts: 1
                    }
                })
            });

            const voiceResult = await voiceResponse.json();
            console.log('Voice API Response status:', voiceResponse.status);
            console.log('Voice API Response body:', voiceResult);

            if (voiceResponse.ok) {
                console.log('✅ Voice alert API test with auth token successful!');
            } else {
                console.log('❌ Voice alert API test failed!');
            }
        } else {
            console.log('❌ Demo login failed!');
        }
    } catch (error) {
        console.error('Error testing demo login:', error);
    }
}

testDemoLogin();