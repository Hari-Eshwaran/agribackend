const express = require('express');
const router = express.Router();
const { handleRazorpayWebhook } = require('../controllers/webhooks');

// Razorpay webhook endpoint (no authentication required for webhooks)
router.post('/razorpay', express.raw({ type: 'application/json' }), handleRazorpayWebhook);

module.exports = router;