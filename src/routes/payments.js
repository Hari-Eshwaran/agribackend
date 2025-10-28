const express = require('express');
const router = express.Router();
const {
    createPaymentIntent,
    confirmPayment,
    getPaymentHistory,
    processRefund,
    getPaymentMethods,
    addPaymentMethod,
    deletePaymentMethod,
    releaseEscrow,
    getPaymentStatus
} = require('../controllers/index');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');
const paymentAnalytics = require('../utils/paymentAnalytics');

// All payment routes require authentication
router.use(authenticateToken);

// Create payment intent for an order
router.post('/create-intent', createPaymentIntent);

// Confirm payment after Razorpay callback
router.post('/:paymentId/confirm', confirmPayment);

// Release escrow funds (after delivery)
router.post('/:paymentId/release-escrow', releaseEscrow);

// Get payment status and workflow
router.get('/:paymentId/status', getPaymentStatus);

// Get user's payment history
router.get('/history', getPaymentHistory);

// Process refund for a payment
router.post('/:paymentId/refund', processRefund);

// Get user's saved payment methods
router.get('/methods', getPaymentMethods);

// Add a new payment method
router.post('/methods', addPaymentMethod);

// Delete a payment method
router.delete('/methods/:methodId', deletePaymentMethod);

// Analytics endpoints
router.get('/analytics/user', async (req, res) => {
    try {
        const userId = req.user.id;
        const { timeframe = 30 } = req.query;

        const analytics = await paymentAnalytics.getUserPaymentAnalytics(userId, parseInt(timeframe));

        res.json({
            success: true,
            data: analytics
        });
    } catch (error) {
        console.error('Get user payment analytics error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

router.get('/analytics/escrow', async (req, res) => {
    try {
        const userId = req.user.id;
        const { timeframe = 30 } = req.query;

        const analytics = await paymentAnalytics.getEscrowAnalytics(userId, parseInt(timeframe));

        res.json({
            success: true,
            data: analytics
        });
    } catch (error) {
        console.error('Get escrow analytics error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

router.get('/verify-transaction/:transactionHash', async (req, res) => {
    try {
        const { transactionHash } = req.params;

        const verification = await paymentAnalytics.getTransactionVerificationStatus(transactionHash);

        res.json({
            success: true,
            data: verification
        });
    } catch (error) {
        console.error('Transaction verification error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// Admin-only analytics endpoints
router.get('/analytics/platform', authorizeRoles('admin'), async (req, res) => {
    try {
        const { timeframe = 30 } = req.query;

        const analytics = await paymentAnalytics.getPlatformPaymentAnalytics(parseInt(timeframe));

        res.json({
            success: true,
            data: analytics
        });
    } catch (error) {
        console.error('Get platform analytics error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

router.get('/analytics/fraud-alerts', authorizeRoles('admin'), async (req, res) => {
    try {
        const { timeframe = 7 } = req.query;

        const alerts = await paymentAnalytics.getFraudAlerts(parseInt(timeframe));

        res.json({
            success: true,
            data: alerts
        });
    } catch (error) {
        console.error('Get fraud alerts error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

router.get('/analytics/performance', authorizeRoles('admin'), async (req, res) => {
    try {
        const { timeframe = 30 } = req.query;

        const metrics = await paymentAnalytics.getPaymentPerformanceMetrics(parseInt(timeframe));

        res.json({
            success: true,
            data: metrics
        });
    } catch (error) {
        console.error('Get performance metrics error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

module.exports = router;