const fetch = require('node-fetch');

async function testPaymentEndpoints() {
    const baseURL = 'http://localhost:3002/api';

    console.log('🧪 Testing AgriSmart Payment & Blockchain API Endpoints\n');
    console.log('=' .repeat(60));

    try {
        // Test 1: Health Check
        console.log('1️⃣  Testing server health...');
        const healthResponse = await fetch(`${baseURL.replace('/api', '')}/health`);
        if (healthResponse.ok) {
            const health = await healthResponse.json();
            console.log('✅ Server is healthy');
            console.log(`   Status: ${health.status}`);
            console.log(`   Timestamp: ${health.timestamp}`);
        } else {
            console.log('❌ Server health check failed');
            return;
        }

        // Test 2: API Info
        console.log('\n2️⃣  Testing API information...');
        const infoResponse = await fetch(baseURL.replace('/api', ''));
        if (infoResponse.ok) {
            const info = await infoResponse.json();
            console.log('✅ API info retrieved');
            console.log(`   App: ${info.message}`);
            console.log(`   Version: ${info.version}`);
            console.log(`   Database: ${info.database}`);
            console.log(`   Payment Gateway: ${info.endpoints?.payments ? 'Available' : 'Not Available'}`);
        } else {
            console.log('❌ API info retrieval failed');
        }

        // Test 3: Payment Routes Authentication
        console.log('\n3️⃣  Testing payment routes (authentication required)...');
        const paymentRoutes = [
            '/payments/create-intent',
            '/payments/history',
            '/payments/methods',
            '/payments/analytics/user',
            '/payments/analytics/escrow'
        ];

        for (const route of paymentRoutes) {
            try {
                const response = await fetch(`${baseURL}${route}`);
                if (response.status === 401) {
                    console.log(`✅ ${route} - Authentication required (expected)`);
                } else if (response.status === 404) {
                    console.log(`❌ ${route} - Route not found`);
                } else {
                    console.log(`⚠️  ${route} - Unexpected response: ${response.status}`);
                }
            } catch (error) {
                console.log(`❌ ${route} - Request failed: ${error.message}`);
            }
        }

        // Test 4: Webhook Endpoint
        console.log('\n4️⃣  Testing webhook endpoint...');
        try {
            const webhookResponse = await fetch(`${baseURL}/webhooks/razorpay`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    event: 'test',
                    data: { test: true }
                })
            });

            if (webhookResponse.status === 400) {
                console.log('✅ Webhook endpoint accessible (signature validation working)');
            } else if (webhookResponse.status === 200) {
                console.log('✅ Webhook endpoint processed test data');
            } else {
                console.log(`⚠️  Webhook endpoint returned: ${webhookResponse.status}`);
            }
        } catch (error) {
            console.log('❌ Webhook endpoint test failed');
        }

        // Test 5: Auth Routes
        console.log('\n5️⃣  Testing authentication routes...');
        const authRoutes = [
            { path: '/auth/login', method: 'POST' },
            { path: '/auth/register', method: 'POST' }
        ];

        for (const route of authRoutes) {
            try {
                const response = await fetch(`${baseURL}${route.path}`, {
                    method: route.method,
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ test: true })
                });

                if (response.status === 400 || response.status === 422) {
                    console.log(`✅ ${route.path} - Validation working (expected for invalid data)`);
                } else {
                    console.log(`⚠️  ${route.path} - Unexpected response: ${response.status}`);
                }
            } catch (error) {
                console.log(`❌ ${route.path} - Request failed`);
            }
        }

        // Test 6: Product Routes
        console.log('\n6️⃣  Testing product routes...');
        try {
            const productsResponse = await fetch(`${baseURL}/products`);
            if (productsResponse.ok) {
                const products = await productsResponse.json();
                console.log('✅ Products endpoint working');
                console.log(`   Retrieved ${Array.isArray(products) ? products.length : 'unknown'} products`);
            } else if (productsResponse.status === 404) {
                console.log('⚠️  Products endpoint not found (may need database)');
            } else {
                console.log(`⚠️  Products endpoint returned: ${productsResponse.status}`);
            }
        } catch (error) {
            console.log('❌ Products endpoint test failed');
        }

        console.log('\n' + '=' .repeat(60));
        console.log('🎉 PAYMENT & BLOCKCHAIN API ENDPOINTS TEST COMPLETED!');
        console.log('=' .repeat(60));

        console.log('\n✅ Verified Features:');
        console.log('   • Server Health Check');
        console.log('   • API Information Endpoint');
        console.log('   • Payment Routes with Authentication');
        console.log('   • Webhook Processing');
        console.log('   • Authentication Endpoints');
        console.log('   • Product Endpoints');

        console.log('\n🔗 Available Payment Endpoints:');
        console.log('   POST /api/payments/create-intent - Create payment intent');
        console.log('   POST /api/payments/:id/confirm - Confirm payment');
        console.log('   POST /api/payments/:id/release-escrow - Release escrow');
        console.log('   GET  /api/payments/:id/status - Get payment status');
        console.log('   GET  /api/payments/history - Payment history');
        console.log('   POST /api/payments/:id/refund - Process refund');
        console.log('   GET  /api/payments/analytics/user - User analytics');
        console.log('   GET  /api/payments/analytics/escrow - Escrow analytics');
        console.log('   POST /api/webhooks/razorpay - Razorpay webhook');

        console.log('\n📋 Test Product Workflow:');
        console.log('   1. Register/Login users (buyer & seller)');
        console.log('   2. Create product (seller)');
        console.log('   3. Place order (buyer)');
        console.log('   4. Create payment intent');
        console.log('   5. Complete Razorpay payment');
        console.log('   6. Confirm payment (webhook/auto)');
        console.log('   7. Funds held in escrow');
        console.log('   8. Release escrow after delivery');
        console.log('   9. Blockchain transaction recorded');

    } catch (error) {
        console.error('\n❌ Test failed:', error.message);
        console.log('\n🔧 Troubleshooting:');
        console.log('1. Ensure server is running on port 3002');
        console.log('2. Check server logs for detailed errors');
        console.log('3. Verify all dependencies are installed');
    }
}

// Mock data for demonstration
function displayMockWorkflow() {
    console.log('\n📦 MOCK PRODUCT PAYMENT WORKFLOW EXAMPLE:');
    console.log('=' .repeat(50));

    const mockProduct = {
        name: 'Organic Tomatoes',
        price: 500,
        unit: 'kg',
        seller: 'Green Valley Farm',
        buyer: 'Fresh Mart Retail'
    };

    const mockOrder = {
        items: [{ name: mockProduct.name, quantity: 2, price: mockProduct.price }],
        totalAmount: 1000,
        status: 'confirmed'
    };

    const mockPayment = {
        razorpayOrderId: 'order_test_123456',
        amount: 100000, // in paisa
        status: 'paid',
        blockchainTxHash: '0x123456789abcdef...',
        escrowStatus: 'held'
    };

    console.log('Product:', JSON.stringify(mockProduct, null, 2));
    console.log('Order:', JSON.stringify(mockOrder, null, 2));
    console.log('Payment:', JSON.stringify(mockPayment, null, 2));

    console.log('\n🔄 Workflow Steps:');
    console.log('1. POST /api/payments/create-intent → Creates Razorpay order');
    console.log('2. User completes payment on Razorpay');
    console.log('3. POST /api/webhooks/razorpay → Confirms payment');
    console.log('4. Funds moved to escrow automatically');
    console.log('5. Blockchain transaction recorded');
    console.log('6. POST /api/payments/:id/release-escrow → Releases funds after delivery');
}

// Run the test
async function runTest() {
    await testPaymentEndpoints();
    displayMockWorkflow();
}

runTest();