const crypto = require('crypto-js');
const paymentWorkflow = require('../utils/paymentWorkflow');
const { Payment, Order, Notification } = require('../models/index');

// Razorpay Webhook Handler
const handleRazorpayWebhook = async (req, res) => {
    try {
        const secret = process.env.RAZORPAY_WEBHOOK_SECRET || 'test_webhook_secret';

        // Verify webhook signature
        const expectedSignature = crypto.HmacSHA256(
            JSON.stringify(req.body),
            secret
        ).toString(crypto.enc.Hex);

        const receivedSignature = req.headers['x-razorpay-signature'];

        if (expectedSignature !== receivedSignature) {
            console.error('Invalid webhook signature');
            return res.status(400).json({ error: 'Invalid signature' });
        }

        const event = req.body.event;
        const paymentEntity = req.body.payload.payment.entity;

        console.log(`Received webhook: ${event}`, { paymentId: paymentEntity.id });

        switch (event) {
            case 'payment.captured':
                await handlePaymentCaptured(paymentEntity);
                break;

            case 'payment.failed':
                await handlePaymentFailed(paymentEntity);
                break;

            case 'refund.created':
                await handleRefundCreated(req.body.payload.refund.entity);
                break;

            case 'refund.failed':
                await handleRefundFailed(req.body.payload.refund.entity);
                break;

            default:
                console.log(`Unhandled webhook event: ${event}`);
        }

        res.json({ status: 'ok' });
    } catch (error) {
        console.error('Webhook processing error:', error);
        res.status(500).json({ error: 'Webhook processing failed' });
    }
};

// Handle successful payment capture
const handlePaymentCaptured = async (paymentEntity) => {
    try {
        // Find payment by Razorpay payment ID
        const payment = await Payment.findOne({ razorpayPaymentId: paymentEntity.id });

        if (!payment) {
            console.error('Payment not found for Razorpay payment ID:', paymentEntity.id);
            return;
        }

        if (payment.status === 'paid') {
            console.log('Payment already processed:', payment._id);
            return;
        }

        // Update payment status
        payment.status = 'paid';
        payment.paymentMethod = paymentEntity.method;
        payment.metadata = {
            ...payment.metadata,
            razorpayWebhook: paymentEntity,
            capturedAt: new Date()
        };

        await payment.save();

        // Update order status
        await Order.findByIdAndUpdate(payment.order, {
            status: 'paid',
            paymentStatus: 'escrow_held'
        });

        // Create notification
        const order = await Order.findById(payment.order).populate('buyer', 'name');
        await createNotification({
            user: order.buyer,
            type: 'payment',
            title: 'Payment Successful',
            message: `Your payment of ₹${payment.amount} has been processed successfully.`,
            data: { orderId: order._id, paymentId: payment._id }
        });

        await createNotification({
            user: order.seller,
            type: 'payment',
            title: 'Payment Received',
            message: `Payment of ₹${payment.amount} received from ${order.buyer.name}. Funds are held in escrow.`,
            data: { orderId: order._id, paymentId: payment._id }
        });

        console.log('Payment captured successfully:', payment._id);
    } catch (error) {
        console.error('Handle payment captured error:', error);
    }
};

// Handle payment failure
const handlePaymentFailed = async (paymentEntity) => {
    try {
        const payment = await Payment.findOne({ razorpayPaymentId: paymentEntity.id });

        if (!payment) {
            console.error('Payment not found for failed payment:', paymentEntity.id);
            return;
        }

        // Update payment status
        payment.status = 'failed';
        payment.metadata = {
            ...payment.metadata,
            razorpayWebhook: paymentEntity,
            failedAt: new Date(),
            failureReason: paymentEntity.error_description
        };

        await payment.save();

        // Update order status
        await Order.findByIdAndUpdate(payment.order, {
            status: 'payment_failed',
            paymentStatus: 'failed'
        });

        // Create notification
        await createNotification({
            user: payment.user,
            type: 'payment',
            title: 'Payment Failed',
            message: `Your payment of ₹${payment.amount} could not be processed. ${paymentEntity.error_description || ''}`,
            data: { orderId: payment.order, paymentId: payment._id }
        });

        console.log('Payment failure handled:', payment._id);
    } catch (error) {
        console.error('Handle payment failed error:', error);
    }
};

// Handle refund creation
const handleRefundCreated = async (refundEntity) => {
    try {
        const payment = await Payment.findOne({ razorpayPaymentId: refundEntity.payment_id });

        if (!payment) {
            console.error('Payment not found for refund:', refundEntity.payment_id);
            return;
        }

        // Update payment status
        payment.status = 'refunded';
        payment.metadata = {
            ...payment.metadata,
            razorpayRefundWebhook: refundEntity,
            refundedAt: new Date()
        };

        await payment.save();

        // Update order status
        await Order.findByIdAndUpdate(payment.order, { status: 'refunded' });

        // Create notification
        await createNotification({
            user: payment.user,
            type: 'payment',
            title: 'Refund Processed',
            message: `Refund of ₹${refundEntity.amount / 100} has been processed successfully.`,
            data: { orderId: payment.order, paymentId: payment._id }
        });

        console.log('Refund processed successfully:', refundEntity.id);
    } catch (error) {
        console.error('Handle refund created error:', error);
    }
};

// Handle refund failure
const handleRefundFailed = async (refundEntity) => {
    try {
        console.log('Refund failed:', refundEntity.id, refundEntity.error_description);

        // Create notification for admin/system alert
        await createNotification({
            user: null, // System notification
            type: 'system',
            title: 'Refund Failed',
            message: `Refund ${refundEntity.id} failed: ${refundEntity.error_description}`,
            data: { refundId: refundEntity.id }
        });
    } catch (error) {
        console.error('Handle refund failed error:', error);
    }
};

// Helper function to create notifications
const createNotification = async (notificationData) => {
    try {
        const notification = new Notification(notificationData);
        await notification.save();
        return notification;
    } catch (error) {
        console.error('Create notification error:', error);
    }
};

module.exports = {
    handleRazorpayWebhook
};