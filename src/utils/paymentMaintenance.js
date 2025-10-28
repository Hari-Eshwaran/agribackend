const cron = require('node-cron');
const paymentWorkflow = require('./paymentWorkflow');
const paymentAnalytics = require('./paymentAnalytics');
const { Escrow, Payment, Notification } = require('../models/index');

// Payment Maintenance Service - Handles scheduled tasks
class PaymentMaintenanceService {
    constructor() {
        this.jobs = [];
    }

    // Initialize all scheduled jobs
    initializeJobs() {
        console.log('Initializing payment maintenance jobs...');

        // Auto-release escrows daily at 2 AM
        this.scheduleAutoReleaseEscrows();

        // Clean up old failed payments weekly
        this.scheduleCleanupFailedPayments();

        // Generate weekly payment reports
        this.scheduleWeeklyReports();

        // Monitor escrow disputes
        this.scheduleEscrowMonitoring();

        console.log('Payment maintenance jobs initialized');
    }

    // Auto-release escrows that meet criteria
    scheduleAutoReleaseEscrows() {
        const job = cron.schedule('0 2 * * *', async () => {
            console.log('Running auto-release escrow job...');

            try {
                await paymentWorkflow.autoReleaseEscrow();
                console.log('Auto-release escrow job completed');
            } catch (error) {
                console.error('Auto-release escrow job failed:', error);
            }
        }, {
            scheduled: false // Don't start immediately
        });

        this.jobs.push({ name: 'autoReleaseEscrows', job });
    }

    // Clean up old failed payments (older than 30 days)
    scheduleCleanupFailedPayments() {
        const job = cron.schedule('0 3 * * 0', async () => {
            console.log('Running cleanup failed payments job...');

            try {
                const thirtyDaysAgo = new Date();
                thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

                const result = await Payment.deleteMany({
                    status: 'failed',
                    createdAt: { $lt: thirtyDaysAgo }
                });

                console.log(`Cleaned up ${result.deletedCount} old failed payments`);
            } catch (error) {
                console.error('Cleanup failed payments job failed:', error);
            }
        }, {
            scheduled: false
        });

        this.jobs.push({ name: 'cleanupFailedPayments', job });
    }

    // Generate weekly payment analytics reports
    scheduleWeeklyReports() {
        const job = cron.schedule('0 4 * * 1', async () => {
            console.log('Running weekly payment reports job...');

            try {
                // Generate platform analytics
                const platformAnalytics = await paymentAnalytics.getPlatformPaymentAnalytics(7);

                // Generate fraud alerts
                const fraudAlerts = await paymentAnalytics.getFraudAlerts(7);

                // Create system notification for admin
                if (fraudAlerts.total > 0) {
                    await this.createSystemNotification({
                        type: 'system',
                        title: 'Weekly Fraud Alert Report',
                        message: `Found ${fraudAlerts.total} potential fraud alerts this week`,
                        data: { fraudAlerts, platformAnalytics }
                    });
                }

                // Log analytics summary
                console.log('Weekly payment report generated:', {
                    totalPayments: platformAnalytics.payments.total,
                    successRate: platformAnalytics.payments.successRate,
                    totalVolume: platformAnalytics.volume.total,
                    fraudAlerts: fraudAlerts.total
                });

            } catch (error) {
                console.error('Weekly reports job failed:', error);
            }
        }, {
            scheduled: false
        });

        this.jobs.push({ name: 'weeklyReports', job });
    }

    // Monitor escrows for potential issues
    scheduleEscrowMonitoring() {
        const job = cron.schedule('0 */6 * * *', async () => {
            console.log('Running escrow monitoring job...');

            try {
                // Check for escrows held longer than expected
                const fourteenDaysAgo = new Date();
                fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);

                const longHeldEscrows = await Escrow.find({
                    status: 'held',
                    heldAt: { $lt: fourteenDaysAgo }
                }).populate('buyer', 'name email').populate('seller', 'name email');

                // Notify admins of long-held escrows
                if (longHeldEscrows.length > 0) {
                    await this.createSystemNotification({
                        type: 'system',
                        title: 'Long-held Escrows Alert',
                        message: `${longHeldEscrows.length} escrows have been held for more than 14 days`,
                        data: {
                            longHeldEscrows: longHeldEscrows.map(e => ({
                                id: e._id,
                                amount: e.amount,
                                buyer: e.buyer.name,
                                seller: e.seller.name,
                                heldAt: e.heldAt
                            }))
                        }
                    });
                }

                // Check for disputed escrows
                const disputedEscrows = await Escrow.find({
                    status: 'disputed',
                    updatedAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } // Last 24 hours
                });

                if (disputedEscrows.length > 0) {
                    await this.createSystemNotification({
                        type: 'system',
                        title: 'New Escrow Disputes',
                        message: `${disputedEscrows.length} new escrow disputes in the last 24 hours`,
                        data: { disputedEscrows: disputedEscrows.length }
                    });
                }

                console.log(`Escrow monitoring: ${longHeldEscrows.length} long-held, ${disputedEscrows.length} disputed`);

            } catch (error) {
                console.error('Escrow monitoring job failed:', error);
            }
        }, {
            scheduled: false
        });

        this.jobs.push({ name: 'escrowMonitoring', job });
    }

    // Start all scheduled jobs
    startJobs() {
        this.jobs.forEach(({ name, job }) => {
            job.start();
            console.log(`Started job: ${name}`);
        });
    }

    // Stop all scheduled jobs
    stopJobs() {
        this.jobs.forEach(({ name, job }) => {
            job.stop();
            console.log(`Stopped job: ${name}`);
        });
    }

    // Get job status
    getJobStatus() {
        return this.jobs.map(({ name, job }) => ({
            name,
            running: job.running,
            scheduled: job.scheduled
        }));
    }

    // Manual trigger for testing
    async triggerJob(jobName) {
        const jobConfig = this.jobs.find(j => j.name === jobName);
        if (!jobConfig) {
            throw new Error(`Job ${jobName} not found`);
        }

        switch (jobName) {
            case 'autoReleaseEscrows':
                await paymentWorkflow.autoReleaseEscrow();
                break;
            case 'cleanupFailedPayments':
                const thirtyDaysAgo = new Date();
                thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
                const result = await Payment.deleteMany({
                    status: 'failed',
                    createdAt: { $lt: thirtyDaysAgo }
                });
                return { deletedCount: result.deletedCount };
            case 'weeklyReports':
                const analytics = await paymentAnalytics.getPlatformPaymentAnalytics(7);
                return analytics;
            case 'escrowMonitoring':
                const longHeld = await Escrow.countDocuments({
                    status: 'held',
                    heldAt: { $lt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000) }
                });
                return { longHeldEscrows: longHeld };
            default:
                throw new Error(`Job ${jobName} cannot be triggered manually`);
        }

        return { success: true, job: jobName };
    }

    // Helper to create system notifications
    async createSystemNotification(notificationData) {
        try {
            const notification = new Notification({
                ...notificationData,
                user: null // System notification
            });
            await notification.save();
            return notification;
        } catch (error) {
            console.error('Create system notification error:', error);
        }
    }

    // Emergency stop all payments (admin function)
    async emergencyStop(reason) {
        try {
            // Stop accepting new payments
            console.log(`Emergency stop initiated: ${reason}`);

            // Create system-wide alert
            await this.createSystemNotification({
                type: 'system',
                title: 'Payment System Emergency Stop',
                message: `Payment processing has been stopped: ${reason}`,
                data: { reason, timestamp: new Date() }
            });

            // Stop all scheduled jobs
            this.stopJobs();

            return { success: true, message: 'Payment system stopped', reason };
        } catch (error) {
            console.error('Emergency stop failed:', error);
            throw error;
        }
    }

    // Resume payment processing
    async resumeProcessing() {
        try {
            console.log('Resuming payment processing...');

            // Start all scheduled jobs
            this.startJobs();

            // Create system notification
            await this.createSystemNotification({
                type: 'system',
                title: 'Payment System Resumed',
                message: 'Payment processing has been resumed',
                data: { timestamp: new Date() }
            });

            return { success: true, message: 'Payment system resumed' };
        } catch (error) {
            console.error('Resume processing failed:', error);
            throw error;
        }
    }
}

module.exports = new PaymentMaintenanceService();