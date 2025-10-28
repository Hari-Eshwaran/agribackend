const { BlockchainTransaction, Payment, Escrow, User } = require('../models/index');
const blockchainService = require('./blockchain');

// Payment Analytics and Monitoring Service
class PaymentAnalyticsService {
    // Get payment analytics for a user
    async getUserPaymentAnalytics(userId, timeframe = 30) {
        try {
            const startDate = new Date();
            startDate.setDate(startDate.getDate() - timeframe);

            // Get user's payments
            const payments = await Payment.find({
                user: userId,
                createdAt: { $gte: startDate }
            }).populate('order', 'totalAmount status');

            // Calculate analytics
            const totalPayments = payments.length;
            const successfulPayments = payments.filter(p => p.status === 'paid' || p.status === 'completed').length;
            const failedPayments = payments.filter(p => p.status === 'failed').length;
            const refundedPayments = payments.filter(p => p.status === 'refunded').length;

            const totalAmount = payments.reduce((sum, p) => sum + p.amount, 0);
            const successfulAmount = payments
                .filter(p => p.status === 'paid' || p.status === 'completed')
                .reduce((sum, p) => sum + p.amount, 0);

            const successRate = totalPayments > 0 ? (successfulPayments / totalPayments) * 100 : 0;

            // Get blockchain transactions
            const blockchainTxs = await blockchainService.getTransactionHistory(userId, {
                limit: 100
            });

            return {
                timeframe: `${timeframe} days`,
                payments: {
                    total: totalPayments,
                    successful: successfulPayments,
                    failed: failedPayments,
                    refunded: refundedPayments,
                    successRate: Math.round(successRate * 100) / 100
                },
                amounts: {
                    total: Math.round(totalAmount * 100) / 100,
                    successful: Math.round(successfulAmount * 100) / 100,
                    averagePayment: totalPayments > 0 ? Math.round((totalAmount / totalPayments) * 100) / 100 : 0
                },
                blockchain: {
                    totalTransactions: blockchainTxs.length,
                    verifiedTransactions: blockchainTxs.filter(tx => tx.status === 'confirmed').length,
                    networks: [...new Set(blockchainTxs.map(tx => tx.network))]
                },
                recentPayments: payments.slice(0, 5).map(p => ({
                    id: p._id,
                    amount: p.amount,
                    status: p.status,
                    date: p.createdAt,
                    blockchainTx: p.blockchainTxHash
                }))
            };
        } catch (error) {
            console.error('Get user payment analytics error:', error);
            throw new Error('Failed to fetch payment analytics');
        }
    }

    // Get platform-wide payment analytics
    async getPlatformPaymentAnalytics(timeframe = 30) {
        try {
            const startDate = new Date();
            startDate.setDate(startDate.getDate() - timeframe);

            // Get all payments in timeframe
            const payments = await Payment.find({
                createdAt: { $gte: startDate }
            });

            // Get escrow statistics
            const escrows = await Escrow.find({
                createdAt: { $gte: startDate }
            });

            // Calculate platform metrics
            const totalPayments = payments.length;
            const totalVolume = payments.reduce((sum, p) => sum + p.amount, 0);
            const successfulPayments = payments.filter(p => p.status === 'paid' || p.status === 'completed').length;
            const escrowHeld = escrows.filter(e => e.status === 'held').length;
            const escrowReleased = escrows.filter(e => e.status === 'released').length;

            // Get blockchain network stats
            const networkStats = await blockchainService.getNetworkStats();

            // Payment method distribution
            const paymentMethods = {};
            payments.forEach(payment => {
                const method = payment.paymentMethod || 'unknown';
                paymentMethods[method] = (paymentMethods[method] || 0) + 1;
            });

            return {
                timeframe: `${timeframe} days`,
                payments: {
                    total: totalPayments,
                    successful: successfulPayments,
                    successRate: totalPayments > 0 ? Math.round((successfulPayments / totalPayments) * 100 * 100) / 100 : 0,
                    averageAmount: totalPayments > 0 ? Math.round((totalVolume / totalPayments) * 100) / 100 : 0
                },
                volume: {
                    total: Math.round(totalVolume * 100) / 100,
                    escrowHeld: escrows.filter(e => e.status === 'held').reduce((sum, e) => sum + e.amount, 0),
                    escrowReleased: escrows.filter(e => e.status === 'released').reduce((sum, e) => sum + e.amount, 0)
                },
                escrow: {
                    total: escrows.length,
                    held: escrowHeld,
                    released: escrowReleased,
                    disputed: escrows.filter(e => e.status === 'disputed').length,
                    holdRate: escrows.length > 0 ? Math.round((escrowHeld / escrows.length) * 100 * 100) / 100 : 0
                },
                blockchain: networkStats,
                paymentMethods: Object.entries(paymentMethods).map(([method, count]) => ({
                    method,
                    count,
                    percentage: Math.round((count / totalPayments) * 100 * 100) / 100
                }))
            };
        } catch (error) {
            console.error('Get platform payment analytics error:', error);
            throw new Error('Failed to fetch platform analytics');
        }
    }

    // Get transaction verification status
    async getTransactionVerificationStatus(transactionHash) {
        try {
            const verification = await blockchainService.verifyTransaction(transactionHash);

            if (verification.verified) {
                const transaction = verification.transaction;
                const payment = await Payment.findOne({ blockchainTxHash: transactionHash });

                return {
                    verified: true,
                    transaction: {
                        hash: transaction.hash,
                        blockNumber: transaction.blockNumber,
                        status: transaction.status,
                        network: transaction.network,
                        timestamp: transaction.timestamp
                    },
                    payment: payment ? {
                        id: payment._id,
                        amount: payment.amount,
                        status: payment.status,
                        orderId: payment.order
                    } : null
                };
            } else {
                return {
                    verified: false,
                    reason: verification.reason,
                    transactionHash
                };
            }
        } catch (error) {
            console.error('Transaction verification error:', error);
            return {
                verified: false,
                reason: 'Verification service unavailable',
                transactionHash
            };
        }
    }

    // Get escrow analytics
    async getEscrowAnalytics(userId = null, timeframe = 30) {
        try {
            const startDate = new Date();
            startDate.setDate(startDate.getDate() - timeframe);

            let query = { createdAt: { $gte: startDate } };
            if (userId) {
                query.$or = [{ buyer: userId }, { seller: userId }];
            }

            const escrows = await Escrow.find(query)
                .populate('buyer', 'name email')
                .populate('seller', 'name email')
                .populate('order', 'status')
                .sort({ createdAt: -1 });

            const analytics = {
                total: escrows.length,
                held: escrows.filter(e => e.status === 'held').length,
                released: escrows.filter(e => e.status === 'released').length,
                disputed: escrows.filter(e => e.status === 'disputed').length,
                refunded: escrows.filter(e => e.status === 'refunded').length,
                totalAmount: escrows.reduce((sum, e) => sum + e.amount, 0),
                averageAmount: escrows.length > 0 ? escrows.reduce((sum, e) => sum + e.amount, 0) / escrows.length : 0,
                averageHoldTime: this.calculateAverageHoldTime(escrows.filter(e => e.status === 'released'))
            };

            if (userId) {
                analytics.asBuyer = escrows.filter(e => e.buyer._id.toString() === userId).length;
                analytics.asSeller = escrows.filter(e => e.seller._id.toString() === userId).length;
            }

            return analytics;
        } catch (error) {
            console.error('Get escrow analytics error:', error);
            throw new Error('Failed to fetch escrow analytics');
        }
    }

    // Calculate average hold time for released escrows
    calculateAverageHoldTime(releasedEscrows) {
        if (releasedEscrows.length === 0) return 0;

        const totalHoldTime = releasedEscrows.reduce((sum, escrow) => {
            const holdTime = escrow.releasedAt - escrow.heldAt;
            return sum + holdTime;
        }, 0);

        // Return average in hours
        return Math.round((totalHoldTime / releasedEscrows.length) / (1000 * 60 * 60) * 100) / 100;
    }

    // Get payment fraud alerts
    async getFraudAlerts(timeframe = 7) {
        try {
            const startDate = new Date();
            startDate.setDate(startDate.getDate() - timeframe);

            const alerts = [];

            // Check for unusual payment patterns
            const recentPayments = await Payment.find({
                createdAt: { $gte: startDate }
            }).populate('user', 'name email');

            // Group by user
            const userPayments = {};
            recentPayments.forEach(payment => {
                const userId = payment.user._id.toString();
                if (!userPayments[userId]) {
                    userPayments[userId] = {
                        user: payment.user,
                        payments: []
                    };
                }
                userPayments[userId].payments.push(payment);
            });

            // Check for suspicious patterns
            Object.values(userPayments).forEach(userData => {
                const { user, payments } = userData;
                const failedPayments = payments.filter(p => p.status === 'failed');

                // High failure rate
                if (payments.length >= 5 && (failedPayments.length / payments.length) > 0.5) {
                    alerts.push({
                        type: 'high_failure_rate',
                        severity: 'medium',
                        user: { id: user._id, name: user.name, email: user.email },
                        message: `User has ${failedPayments.length}/${payments.length} failed payments`,
                        data: { failureRate: (failedPayments.length / payments.length) * 100 }
                    });
                }

                // Multiple large payments
                const largePayments = payments.filter(p => p.amount > 50000);
                if (largePayments.length >= 3) {
                    alerts.push({
                        type: 'multiple_large_payments',
                        severity: 'low',
                        user: { id: user._id, name: user.name, email: user.email },
                        message: `User made ${largePayments.length} payments over ₹50,000`,
                        data: { largePaymentCount: largePayments.length }
                    });
                }
            });

            return {
                total: alerts.length,
                alerts: alerts.sort((a, b) => {
                    const severityOrder = { high: 3, medium: 2, low: 1 };
                    return severityOrder[b.severity] - severityOrder[a.severity];
                })
            };
        } catch (error) {
            console.error('Get fraud alerts error:', error);
            throw new Error('Failed to fetch fraud alerts');
        }
    }

    // Get payment performance metrics
    async getPaymentPerformanceMetrics(timeframe = 30) {
        try {
            const startDate = new Date();
            startDate.setDate(startDate.getDate() - timeframe);

            const payments = await Payment.find({
                createdAt: { $gte: startDate }
            });

            // Calculate performance metrics
            const totalPayments = payments.length;
            const successfulPayments = payments.filter(p => p.status === 'paid' || p.status === 'completed');
            const failedPayments = payments.filter(p => p.status === 'failed');

            // Response time analysis (simulated)
            const avgResponseTime = 2.5; // seconds
            const maxResponseTime = 15; // seconds

            // Success rate by payment method
            const methodStats = {};
            payments.forEach(payment => {
                const method = payment.paymentMethod || 'unknown';
                if (!methodStats[method]) {
                    methodStats[method] = { total: 0, successful: 0 };
                }
                methodStats[method].total++;
                if (payment.status === 'paid' || payment.status === 'completed') {
                    methodStats[method].successful++;
                }
            });

            return {
                timeframe: `${timeframe} days`,
                overall: {
                    totalPayments,
                    successRate: totalPayments > 0 ? Math.round((successfulPayments.length / totalPayments) * 100 * 100) / 100 : 0,
                    failureRate: totalPayments > 0 ? Math.round((failedPayments.length / totalPayments) * 100 * 100) / 100 : 0,
                    averageResponseTime: avgResponseTime,
                    maxResponseTime
                },
                byMethod: Object.entries(methodStats).map(([method, stats]) => ({
                    method,
                    total: stats.total,
                    successful: stats.successful,
                    successRate: Math.round((stats.successful / stats.total) * 100 * 100) / 100
                })),
                trends: {
                    dailySuccessRate: this.calculateDailyTrends(payments, timeframe),
                    peakHours: this.identifyPeakHours(payments)
                }
            };
        } catch (error) {
            console.error('Get payment performance metrics error:', error);
            throw new Error('Failed to fetch performance metrics');
        }
    }

    // Calculate daily success rate trends
    calculateDailyTrends(payments, timeframe) {
        const dailyStats = {};

        payments.forEach(payment => {
            const date = payment.createdAt.toISOString().split('T')[0];
            if (!dailyStats[date]) {
                dailyStats[date] = { total: 0, successful: 0 };
            }
            dailyStats[date].total++;
            if (payment.status === 'paid' || payment.status === 'completed') {
                dailyStats[date].successful++;
            }
        });

        return Object.entries(dailyStats).map(([date, stats]) => ({
            date,
            successRate: Math.round((stats.successful / stats.total) * 100 * 100) / 100,
            totalPayments: stats.total
        })).sort((a, b) => a.date.localeCompare(b.date));
    }

    // Identify peak payment hours
    identifyPeakHours(payments) {
        const hourlyStats = new Array(24).fill(0);

        payments.forEach(payment => {
            const hour = payment.createdAt.getHours();
            hourlyStats[hour]++;
        });

        const maxPayments = Math.max(...hourlyStats);
        const peakHour = hourlyStats.indexOf(maxPayments);

        return {
            peakHour,
            peakHourFormatted: `${peakHour}:00 - ${peakHour + 1}:00`,
            paymentsAtPeak: maxPayments,
            averagePaymentsPerHour: Math.round((payments.length / 24) * 100) / 100
        };
    }
}

module.exports = new PaymentAnalyticsService();