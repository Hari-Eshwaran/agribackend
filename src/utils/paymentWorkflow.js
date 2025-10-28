const Razorpay = require('razorpay');
const crypto = require('crypto-js');
const { Payment, Order, User, Notification, Escrow, PaymentMethod } = require('../models/index');
const blockchainService = require('./blockchain');

// Payment Workflow Manager
class PaymentWorkflowManager {
    constructor() {
        this.razorpay = new Razorpay({
            key_id: process.env.RAZORPAY_KEY_ID || 'rzp_test_RXvtqZ9mxuwewf',
            key_secret: process.env.RAZORPAY_KEY_SECRET || 'fh78cPul1NeNEslW0LX0owG8'
        });
    }

    // Step 1: Initialize Payment Workflow
    async initializePayment(orderId, userId, paymentMethodId = null) {
        try {
            // Validate order
            const order = await Order.findOne({ _id: orderId, buyer: userId });
            if (!order) {
                throw new Error('Order not found or access denied');
            }

            if (order.status !== 'pending') {
                throw new Error('Order is not in payable state');
            }

            // Check for existing payment
            const existingPayment = await Payment.findOne({ order: orderId });
            if (existingPayment) {
                throw new Error('Payment already initiated for this order');
            }

            // Get or validate payment method
            let paymentMethod = null;
            if (paymentMethodId) {
                paymentMethod = await PaymentMethod.findOne({
                    _id: paymentMethodId,
                    user: userId,
                    isActive: true
                });
                if (!paymentMethod) {
                    throw new Error('Invalid payment method');
                }
            }

            // Calculate final amount (including any fees)
            const finalAmount = this.calculateFinalAmount(order.totalAmount);

            return {
                orderId,
                amount: finalAmount,
                currency: 'INR',
                paymentMethod,
                status: 'initialized'
            };
        } catch (error) {
            console.error('Payment initialization error:', error);
            throw error;
        }
    }

    // Step 2: Create Payment Intent
    async createPaymentIntent(orderId, userId, paymentData) {
        try {
            const { amount, currency = 'INR', paymentMethodId } = paymentData;

            // Initialize payment workflow
            const initData = await this.initializePayment(orderId, userId, paymentMethodId);

            // Create Razorpay order
            const razorpayOrder = await this.razorpay.orders.create({
                amount: Math.round(amount * 100), // Convert to paisa
                currency,
                receipt: `order_${orderId}_${Date.now()}`,
                payment_capture: 0, // Manual capture for escrow
                notes: {
                    orderId: orderId.toString(),
                    userId: userId.toString(),
                    workflow: 'agri_escrow'
                }
            });

            // Create payment record
            const payment = new Payment({
                order: orderId,
                user: userId,
                razorpayOrderId: razorpayOrder.id,
                amount,
                currency,
                status: 'created',
                paymentMethod: paymentMethodId ? 'saved_method' : null,
                workflow: {
                    stage: 'intent_created',
                    escrowEnabled: true,
                    steps: ['intent_created', 'payment_completed', 'escrow_held', 'order_delivered', 'escrow_released']
                },
                metadata: {
                    razorpayOrder: razorpayOrder,
                    workflowVersion: '1.0',
                    agriSmartFeatures: ['escrow', 'blockchain', 'transparency']
                }
            });

            await payment.save();

            // Create escrow record
            const escrow = new Escrow({
                payment: payment._id,
                order: orderId,
                buyer: userId,
                seller: (await Order.findById(orderId)).seller,
                amount,
                currency,
                status: 'pending',
                releaseConditions: ['order_delivered', 'buyer_confirmation'],
                autoReleaseDays: 7
            });

            await escrow.save();

            // Record blockchain transaction for intent creation
            const blockchainTx = await blockchainService.recordEscrowTransaction({
                paymentId: payment._id,
                orderId,
                buyerId: userId,
                sellerId: escrow.seller,
                amount,
                currency,
                escrowType: 'payment_intent'
            });

            // Update payment with blockchain info
            payment.blockchainTxHash = blockchainTx.transactionHash;
            payment.blockchainBlockNumber = blockchainTx.blockNumber;
            await payment.save();

            // Notify user
            await this.createNotification({
                user: userId,
                type: 'payment',
                title: 'Payment Intent Created',
                message: `Payment intent created for order #${orderId}. Amount: ₹${amount}`,
                data: { orderId, paymentId: payment._id }
            });

            return {
                success: true,
                paymentId: payment._id,
                escrowId: escrow._id,
                razorpayOrderId: razorpayOrder.id,
                amount: razorpayOrder.amount,
                currency: razorpayOrder.currency,
                razorpayKeyId: process.env.RAZORPAY_KEY_ID || 'rzp_test_RXvtqZ9mxuwewf',
                blockchainTxHash: blockchainTx.transactionHash,
                workflow: payment.workflow
            };
        } catch (error) {
            console.error('Create payment intent error:', error);
            throw new Error(`Failed to create payment intent: ${error.message}`);
        }
    }

    // Step 3: Confirm Payment and Hold in Escrow
    async confirmPayment(paymentId, paymentDetails, userId) {
        try {
            const { razorpayPaymentId, razorpayOrderId, razorpaySignature } = paymentDetails;

            // Find payment
            const payment = await Payment.findById(paymentId);
            if (!payment) {
                throw new Error('Payment not found');
            }

            if (payment.user.toString() !== userId) {
                throw new Error('Unauthorized access to payment');
            }

            if (payment.status !== 'created') {
                throw new Error('Payment is not in confirmable state');
            }

            // Verify Razorpay signature
            const sign = razorpayOrderId + '|' + razorpayPaymentId;
            const expectedSign = crypto.HmacSHA256(sign, process.env.RAZORPAY_KEY_SECRET || 'fh78cPul1NeNEslW0LX0owG8')
                .toString(crypto.enc.Hex);

            if (razorpaySignature !== expectedSign) {
                payment.status = 'failed';
                payment.workflow.stage = 'verification_failed';
                await payment.save();
                throw new Error('Payment verification failed');
            }

            // Capture payment (hold in escrow)
            const captureResponse = await this.razorpay.payments.capture(
                razorpayPaymentId,
                Math.round(payment.amount * 100)
            );

            // Update payment record
            payment.razorpayPaymentId = razorpayPaymentId;
            payment.razorpaySignature = razorpaySignature;
            payment.status = 'paid';
            payment.workflow.stage = 'payment_completed';
            payment.paymentMethod = captureResponse.method;
            payment.metadata = {
                ...payment.metadata,
                razorpayPayment: captureResponse,
                capturedAt: new Date()
            };

            await payment.save();

            // Update escrow status
            const escrow = await Escrow.findOne({ payment: paymentId });
            if (escrow) {
                escrow.status = 'held';
                escrow.heldAt = new Date();
                await escrow.save();
            }

            // Update order status
            await Order.findByIdAndUpdate(payment.order, {
                status: 'paid',
                paymentStatus: 'escrow_held'
            });

            // Record blockchain transaction for payment confirmation
            const order = await Order.findById(payment.order).populate('seller', 'name');
            const blockchainTx = await blockchainService.recordPaymentTransaction({
                paymentId: payment._id,
                orderId: payment.order,
                buyerId: userId,
                sellerId: order.seller._id,
                amount: payment.amount,
                currency: payment.currency,
                paymentMethod: captureResponse.method
            });

            // Update payment with final blockchain info
            payment.blockchainTxHash = blockchainTx.transactionHash;
            payment.blockchainBlockNumber = blockchainTx.blockNumber;
            await payment.save();

            // Notify buyer and seller
            await this.createNotification({
                user: userId,
                type: 'payment',
                title: 'Payment Successful',
                message: `Payment of ₹${payment.amount} completed successfully. Funds are held in escrow.`,
                data: { orderId: payment.order, paymentId: payment._id }
            });

            await this.createNotification({
                user: order.seller,
                type: 'payment',
                title: 'Payment Received',
                message: `Payment of ₹${payment.amount} received for order #${payment.order}. Funds are held in escrow.`,
                data: { orderId: payment.order, paymentId: payment._id }
            });

            return {
                success: true,
                message: 'Payment confirmed and held in escrow',
                paymentId: payment._id,
                escrowId: escrow?._id,
                amount: payment.amount,
                status: payment.status,
                workflow: payment.workflow,
                blockchainTxHash: blockchainTx.transactionHash
            };
        } catch (error) {
            console.error('Confirm payment error:', error);
            throw new Error(`Failed to confirm payment: ${error.message}`);
        }
    }

    // Step 4: Release Escrow (after order delivery)
    async releaseEscrow(paymentId, userId, releaseData = {}) {
        try {
            const payment = await Payment.findById(paymentId);
            if (!payment) {
                throw new Error('Payment not found');
            }

            const escrow = await Escrow.findOne({ payment: paymentId });
            if (!escrow) {
                throw new Error('Escrow not found');
            }

            // Check permissions (only buyer or seller can release)
            const isBuyer = escrow.buyer.toString() === userId;
            const isSeller = escrow.seller.toString() === userId;

            if (!isBuyer && !isSeller) {
                throw new Error('Unauthorized to release escrow');
            }

            if (escrow.status !== 'held') {
                throw new Error('Escrow is not in releasable state');
            }

            // For buyer-initiated release, require delivery confirmation
            if (isBuyer && !releaseData.deliveryConfirmed) {
                throw new Error('Delivery confirmation required for escrow release');
            }

            // Release escrow (transfer funds to seller)
            escrow.status = 'released';
            escrow.releasedAt = new Date();
            escrow.releasedBy = userId;
            escrow.releaseNotes = releaseData.notes || '';

            await escrow.save();

            // Update payment status
            payment.status = 'completed';
            payment.workflow.stage = 'escrow_released';
            payment.completedAt = new Date();

            await payment.save();

            // Update order status
            await Order.findByIdAndUpdate(payment.order, {
                status: 'completed',
                paymentStatus: 'completed'
            });

            // Record blockchain transaction for escrow release
            const blockchainTx = await blockchainService.recordEscrowTransaction({
                paymentId: payment._id,
                orderId: payment.order,
                buyerId: escrow.buyer,
                sellerId: escrow.seller,
                amount: escrow.amount,
                currency: escrow.currency,
                escrowType: 'escrow_released'
            });

            // Notify both parties
            const buyer = await User.findById(escrow.buyer);
            const seller = await User.findById(escrow.seller);

            await this.createNotification({
                user: escrow.buyer,
                type: 'payment',
                title: 'Escrow Released',
                message: `Escrow funds of ₹${escrow.amount} have been released to seller.`,
                data: { orderId: payment.order, paymentId: payment._id }
            });

            await this.createNotification({
                user: escrow.seller,
                type: 'payment',
                title: 'Funds Released',
                message: `Escrow funds of ₹${escrow.amount} have been released to your account.`,
                data: { orderId: payment.order, paymentId: payment._id }
            });

            return {
                success: true,
                message: 'Escrow released successfully',
                escrowId: escrow._id,
                amount: escrow.amount,
                releasedTo: seller.name,
                blockchainTxHash: blockchainTx.transactionHash
            };
        } catch (error) {
            console.error('Release escrow error:', error);
            throw new Error(`Failed to release escrow: ${error.message}`);
        }
    }

    // Process Refund
    async processRefund(paymentId, userId, refundData) {
        try {
            const { amount, reason = 'requested_by_customer', notes } = refundData;

            const payment = await Payment.findOne({ _id: paymentId, user: userId });
            if (!payment) {
                throw new Error('Payment not found');
            }

            if (payment.status !== 'paid') {
                throw new Error('Payment is not eligible for refund');
            }

            const escrow = await Escrow.findOne({ payment: paymentId });
            if (escrow && escrow.status === 'held') {
                throw new Error('Cannot refund while funds are in escrow');
            }

            // Process Razorpay refund
            const refundAmount = amount || payment.amount;
            const razorpayRefund = await this.razorpay.payments.refund(payment.razorpayPaymentId, {
                amount: Math.round(refundAmount * 100),
                notes: { reason, notes: notes || '' }
            });

            // Create refund record
            const refund = new Refund({
                payment: paymentId,
                order: payment.order,
                user: userId,
                razorpayRefundId: razorpayRefund.id,
                amount: refundAmount,
                currency: payment.currency,
                reason,
                status: 'processed',
                notes,
                processedAt: new Date(),
                metadata: { razorpayRefund }
            });

            await refund.save();

            // Update payment status
            payment.status = 'refunded';
            payment.workflow.stage = 'refunded';
            await payment.save();

            // Update escrow if exists
            if (escrow) {
                escrow.status = 'refunded';
                escrow.refundedAt = new Date();
                await escrow.save();
            }

            // Update order status
            await Order.findByIdAndUpdate(payment.order, { status: 'refunded' });

            // Record blockchain transaction for refund
            const order = await Order.findById(payment.order);
            const blockchainTx = await blockchainService.recordRefundTransaction({
                refundId: refund._id,
                paymentId: payment._id,
                orderId: payment.order,
                buyerId: userId,
                sellerId: order.seller,
                amount: refundAmount,
                currency: payment.currency,
                reason
            });

            refund.blockchainTxHash = blockchainTx.transactionHash;
            await refund.save();

            // Notify user
            await this.createNotification({
                user: userId,
                type: 'payment',
                title: 'Refund Processed',
                message: `Refund of ₹${refundAmount} has been processed successfully.`,
                data: { orderId: payment.order, paymentId: payment._id, refundId: refund._id }
            });

            return {
                success: true,
                refundId: refund._id,
                amount: refundAmount,
                razorpayRefundId: razorpayRefund.id,
                blockchainTxHash: blockchainTx.transactionHash
            };
        } catch (error) {
            console.error('Process refund error:', error);
            throw new Error(`Failed to process refund: ${error.message}`);
        }
    }

    // Get Payment Status and Workflow
    async getPaymentStatus(paymentId, userId) {
        try {
            const payment = await Payment.findOne({ _id: paymentId, user: userId });
            if (!payment) {
                throw new Error('Payment not found');
            }

            const escrow = await Escrow.findOne({ payment: paymentId });
            const order = await Order.findById(payment.order);

            return {
                paymentId: payment._id,
                orderId: payment.order,
                status: payment.status,
                amount: payment.amount,
                currency: payment.currency,
                workflow: payment.workflow,
                escrow: escrow ? {
                    status: escrow.status,
                    heldAt: escrow.heldAt,
                    releasedAt: escrow.releasedAt,
                    autoReleaseDays: escrow.autoReleaseDays
                } : null,
                orderStatus: order.status,
                createdAt: payment.createdAt,
                updatedAt: payment.updatedAt
            };
        } catch (error) {
            console.error('Get payment status error:', error);
            throw new Error('Failed to fetch payment status');
        }
    }

    // Calculate final amount with fees
    calculateFinalAmount(baseAmount) {
        // Add platform fee (2%) and Razorpay fee (2%)
        const platformFee = baseAmount * 0.02;
        const razorpayFee = baseAmount * 0.02;
        return Math.round((baseAmount + platformFee + razorpayFee) * 100) / 100;
    }

    // Create notification helper
    async createNotification(notificationData) {
        try {
            const notification = new Notification(notificationData);
            await notification.save();
            return notification;
        } catch (error) {
            console.error('Create notification error:', error);
        }
    }

    // Auto-release escrow after delivery confirmation
    async autoReleaseEscrow() {
        try {
            const expiredEscrows = await Escrow.find({
                status: 'held',
                heldAt: { $lt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } // 7 days ago
            });

            for (const escrow of expiredEscrows) {
                // Check if order is delivered
                const order = await Order.findById(escrow.order);
                if (order && order.status === 'delivered') {
                    await this.releaseEscrow(escrow.payment, escrow.buyer.toString(), {
                        deliveryConfirmed: true,
                        notes: 'Auto-released after delivery confirmation'
                    });
                }
            }
        } catch (error) {
            console.error('Auto-release escrow error:', error);
        }
    }
}

module.exports = new PaymentWorkflowManager();