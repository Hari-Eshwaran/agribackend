const express = require('express');
const router = express.Router();
const twilio = require('twilio');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');

// Initialize Twilio client only if credentials are available
let client = null;
if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
    try {
        client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
        console.log('✅ Twilio client initialized successfully');
    } catch (error) {
        console.warn('⚠️ Failed to initialize Twilio client:', error.message);
    }
} else {
    console.warn('⚠️ Twilio credentials not found in environment variables');
}

/**
 * Generate TwiML for multi-language voice alert
 */
function generateVoiceAlert(message, language = 'multilingual') {
    let twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>`;

    if (language === 'multilingual') {
        // Multi-language alert (Tamil, English, Hindi)
        twiml += `
    <Say voice="Polly.Aditi" language="hi-IN" rate="fast">
        वणक्कम। नांगल अग्रिस्मार्त एलर्त सर्विस। उंगलुक्कु मुक्कियमान कृषि एलर्त उल्लदु। ${message}
    </Say>
    <Pause length="2"/>
    <Say voice="alice" language="en-US" rate="fast">
        Hello. This is AgriSmart alert service. You have an important agricultural alert. ${message}
    </Say>
    <Pause length="2"/>
    <Say voice="Polly.Aditi" language="hi-IN" rate="fast">
        नमस्कार। हम एग्रीस्मार्ट अलर्ट सेवा हैं। आपके लिए महत्वपूर्ण कृषि चेतावनी है। ${message}
    </Say>`;
    } else if (language === 'hi-IN') {
        twiml += `
    <Say voice="Polly.Aditi" language="hi-IN" rate="normal">
        नमस्कार। एग्रीस्मार्ट से महत्वपूर्ण संदेश। ${message}
    </Say>`;
    } else if (language === 'ta-IN') {
        twiml += `
    <Say voice="Polly.Aditi" language="hi-IN" rate="normal">
        वणक्कम। अग्रिस्मार्त इलिरुन्दु मुक्कियमान संदेशम्। ${message}
    </Say>`;
    } else {
        // Default to English
        twiml += `
    <Say voice="alice" language="en-US" rate="normal">
        Hello. This is an important message from AgriSmart. ${message}
    </Say>`;
    }

    twiml += `
    <Pause length="1"/>
    <Say voice="alice" language="en-US" rate="normal">
        Thank you for listening. This alert was sent by AgriSmart monitoring system.
    </Say>
</Response>`;

    return twiml;
}

/**
 * Send voice alert to a phone number
 * POST /api/voice-alerts/send
 */
router.post('/send', authenticateToken, authorizeRoles('admin'), async (req, res) => {
    try {
        // Check if Twilio client is available, try to reinitialize if needed
        if (!client && process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
            try {
                client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
                console.log('✅ Twilio client reinitialized successfully');
            } catch (error) {
                console.warn('⚠️ Failed to reinitialize Twilio client:', error.message);
            }
        }

        if (!client) {
            return res.status(503).json({
                success: false,
                message: 'Voice alert service is not configured. Please check Twilio credentials.'
            });
        }

        const { message, targetNumber, language = 'multilingual', settings = {} } = req.body;

        if (!message || !targetNumber) {
            return res.status(400).json({
                success: false,
                message: 'Message and target number are required'
            });
        }

        // Validate phone number format
        const phoneRegex = /^\+[1-9]\d{1,14}$/;
        if (!phoneRegex.test(targetNumber)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid phone number format. Use international format (+91XXXXXXXXXX)'
            });
        }

        console.log(`🎯 Sending voice alert to ${targetNumber}`);
        console.log(`📝 Message: ${message.substring(0, 100)}...`);
        console.log(`🌐 Language: ${language}`);

        // Generate TwiML for the voice message
        const twiml = generateVoiceAlert(message, language);

        // Make the call using Twilio
        const call = await client.calls.create({
            twiml: twiml,
            to: targetNumber,
            from: process.env.TWILIO_PHONE_NUMBER,
            statusCallback: `${process.env.API_BASE_URL || 'http://localhost:3002'}/api/voice-alerts/callback`,
            statusCallbackEvent: ['initiated', 'ringing', 'answered', 'completed'],
            statusCallbackMethod: 'POST'
        });

        console.log(`✅ Call initiated successfully!`);
        console.log(`📞 Call SID: ${call.sid}`);
        console.log(`📊 Initial Status: ${call.status}`);

        res.json({
            success: true,
            message: 'Voice alert initiated successfully',
            data: {
                callSid: call.sid,
                status: call.status,
                to: targetNumber,
                timestamp: new Date().toISOString()
            }
        });

        // If SMS backup is enabled and call fails, send SMS
        if (settings.smsBackup) {
            setTimeout(async () => {
                try {
                    const callStatus = await client.calls(call.sid).fetch();
                    if (callStatus.status === 'failed' || callStatus.status === 'no-answer') {
                        console.log('📱 Sending SMS backup...');
                        await client.messages.create({
                            body: `AgriSmart Alert: ${message}`,
                            from: process.env.TWILIO_PHONE_NUMBER,
                            to: targetNumber
                        });
                        console.log('✅ SMS backup sent successfully');
                    }
                } catch (error) {
                    console.error('❌ SMS backup failed:', error.message);
                }
            }, 30000); // Wait 30 seconds before checking
        }

    } catch (error) {
        console.error('❌ Voice alert failed:', error);

        let errorMessage = 'Failed to send voice alert';
        if (error.code === 21219) {
            errorMessage = 'Phone number verification required. Please verify the number in Twilio console.';
        } else if (error.code === 21608) {
            errorMessage = 'Account funding required. Please add payment method to Twilio account.';
        } else if (error.code === 21612) {
            errorMessage = 'Invalid phone number or blocked number.';
        }

        res.status(500).json({
            success: false,
            message: errorMessage,
            error: {
                code: error.code,
                details: error.message
            }
        });
    }
});

/**
 * Send test voice alert
 * POST /api/voice-alerts/test
 */
router.post('/test', authenticateToken, authorizeRoles('admin'), async (req, res) => {
    try {
        // Check if Twilio client is available
        if (!client) {
            return res.status(503).json({
                success: false,
                message: 'Voice alert service is not configured. Please check Twilio credentials.'
            });
        }

        const { targetNumber, language = 'multilingual' } = req.body;

        if (!targetNumber) {
            return res.status(400).json({
                success: false,
                message: 'Target number is required'
            });
        }

        const testMessage = 'This is a test voice alert from AgriSmart system. All systems are working correctly.';
        
        console.log(`🧪 Sending test voice alert to ${targetNumber}`);

        // Generate TwiML for test message
        const twiml = generateVoiceAlert(testMessage, language);

        // Make the test call
        const call = await client.calls.create({
            twiml: twiml,
            to: targetNumber,
            from: process.env.TWILIO_PHONE_NUMBER,
            statusCallback: `${process.env.API_BASE_URL || 'http://localhost:3002'}/api/voice-alerts/callback`,
            statusCallbackEvent: ['completed'],
            statusCallbackMethod: 'POST'
        });

        console.log(`✅ Test call initiated!`);
        console.log(`📞 Call SID: ${call.sid}`);

        res.json({
            success: true,
            message: 'Test voice alert initiated successfully',
            data: {
                callSid: call.sid,
                status: call.status,
                to: targetNumber,
                timestamp: new Date().toISOString()
            }
        });

    } catch (error) {
        console.error('❌ Test voice alert failed:', error);

        res.status(500).json({
            success: false,
            message: 'Failed to send test voice alert',
            error: {
                code: error.code,
                details: error.message
            }
        });
    }
});

/**
 * Execute comprehensive voice alert test script
 * POST /api/voice-alerts/comprehensive-test
 */
router.post('/comprehensive-test', authenticateToken, authorizeRoles('admin'), async (req, res) => {
    try {
        const { targetNumber = '+918056129665', customMessage } = req.body;
        
        console.log('🚀 Starting comprehensive voice alert test...');
        
        // Import and execute the comprehensive test
        const { finalTamilVoiceTest } = require('../../final-voice-alert-test');
        
        // Execute the test (this will take about 60+ seconds)
        const result = await finalTamilVoiceTest(targetNumber, customMessage);
        
        console.log('📋 Comprehensive test completed:', result);

        res.json({
            success: result.success,
            message: result.success ? 
                'Comprehensive voice alert test completed successfully' : 
                'Comprehensive voice alert test failed',
            data: result
        });

    } catch (error) {
        console.error('❌ Comprehensive test execution failed:', error);

        res.status(500).json({
            success: false,
            message: 'Failed to execute comprehensive test',
            error: {
                code: error.code || 'EXECUTION_ERROR',
                details: error.message
            }
        });
    }
});

/**
 * Twilio status callback webhook
 * POST /api/voice-alerts/callback
 */
router.post('/callback', (req, res) => {
    const { CallSid, CallStatus, CallDuration, To, From } = req.body;
    
    console.log(`📊 Call Status Update:`);
    console.log(`   SID: ${CallSid}`);
    console.log(`   Status: ${CallStatus}`);
    console.log(`   Duration: ${CallDuration || 0} seconds`);
    console.log(`   To: ${To}`);
    
    // Here you could update your database with call status
    // Example: Update call status in database
    // await CallLog.updateOne({ callSid: CallSid }, { status: CallStatus, duration: CallDuration });
    
    res.status(200).send('OK');
});

/**
 * Get call history
 * GET /api/voice-alerts/history
 */
router.get('/history', authenticateToken, authorizeRoles('admin'), async (req, res) => {
    try {
        // Check if Twilio client is available
        if (!client) {
            return res.status(503).json({
                success: false,
                message: 'Voice alert service is not configured. Please check Twilio credentials.'
            });
        }

        const { limit = 50 } = req.query;

        // Fetch recent calls from Twilio
        const calls = await client.calls.list({ limit: parseInt(limit) });

        const callHistory = calls.map(call => ({
            sid: call.sid,
            to: call.to,
            from: call.from,
            status: call.status,
            duration: call.duration,
            dateCreated: call.dateCreated,
            price: call.price,
            priceUnit: call.priceUnit
        }));

        res.json({
            success: true,
            data: callHistory
        });

    } catch (error) {
        console.error('❌ Failed to fetch call history:', error);

        res.status(500).json({
            success: false,
            message: 'Failed to fetch call history',
            error: error.message
        });
    }
});

/**
 * Get voice alert statistics
 * GET /api/voice-alerts/stats
 */
router.get('/stats', authenticateToken, authorizeRoles('admin'), async (req, res) => {
    try {
        // Check if Twilio client is available
        if (!client) {
            return res.status(503).json({
                success: false,
                message: 'Voice alert service is not configured. Please check Twilio credentials.'
            });
        }

        // Fetch recent calls for statistics
        const calls = await client.calls.list({ limit: 100 });

        const stats = {
            totalCalls: calls.length,
            completedCalls: calls.filter(c => c.status === 'completed').length,
            failedCalls: calls.filter(c => c.status === 'failed').length,
            averageDuration: calls
                .filter(c => c.duration)
                .reduce((acc, c) => acc + parseInt(c.duration), 0) / calls.filter(c => c.duration).length || 0,
            totalCost: calls
                .filter(c => c.price)
                .reduce((acc, c) => acc + parseFloat(c.price), 0),
            successRate: calls.length > 0 ? 
                (calls.filter(c => c.status === 'completed').length / calls.length * 100).toFixed(2) : 0
        };

        res.json({
            success: true,
            data: stats
        });

    } catch (error) {
        console.error('❌ Failed to fetch voice alert stats:', error);

        res.status(500).json({
            success: false,
            message: 'Failed to fetch statistics',
            error: error.message
        });
    }
});

module.exports = router;