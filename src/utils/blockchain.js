const crypto = require('crypto-js');
const { BlockchainTransaction, Payment, Order } = require('../models/index');

// Blockchain Service for AgriSmart Payment Transparency
class BlockchainService {
    constructor() {
        this.network = process.env.BLOCKCHAIN_NETWORK || 'polygon';
        this.contractAddress = process.env.CONTRACT_ADDRESS || '0x742d35Cc6634C0532925a3b844Bc454e4438f44e';
        this.chainId = this.getChainId();
    }

    getChainId() {
        const networks = {
            'polygon': 137,
            'ethereum': 1,
            'bsc': 56,
            'polygon-testnet': 80001
        };
        return networks[this.network] || 137;
    }

    // Generate transaction hash
    generateTransactionHash(data) {
        const hashString = JSON.stringify({
            ...data,
            timestamp: Date.now(),
            nonce: crypto.lib.WordArray.random(32).toString()
        });
        return crypto.SHA256(hashString).toString();
    }

    // Simulate block number (in production, this would come from blockchain)
    generateBlockNumber() {
        return Math.floor(Date.now() / 10000) + Math.floor(Math.random() * 1000);
    }

    // Record payment transaction on blockchain
    async recordPaymentTransaction(paymentData) {
        try {
            const {
                paymentId,
                orderId,
                buyerId,
                sellerId,
                amount,
                currency = 'INR',
                paymentMethod
            } = paymentData;

            // Create blockchain transaction record
            const transactionHash = this.generateTransactionHash({
                type: 'payment',
                paymentId,
                orderId,
                buyerId,
                sellerId,
                amount,
                currency,
                paymentMethod
            });

            const blockNumber = this.generateBlockNumber();

            const blockchainTx = new BlockchainTransaction({
                payment: paymentId,
                transactionHash,
                blockNumber,
                fromAddress: buyerId.toString(),
                toAddress: sellerId.toString(),
                amount,
                currency,
                transactionType: 'payment',
                status: 'confirmed',
                network: this.network,
                contractAddress: this.contractAddress,
                metadata: {
                    orderId,
                    paymentMethod,
                    chainId: this.chainId
                }
            });

            await blockchainTx.save();

            // Update payment with blockchain info
            await Payment.findByIdAndUpdate(paymentId, {
                blockchainTxHash: transactionHash,
                blockchainBlockNumber: blockNumber
            });

            return {
                transactionHash,
                blockNumber,
                status: 'confirmed',
                network: this.network,
                explorerUrl: this.getExplorerUrl(transactionHash)
            };
        } catch (error) {
            console.error('Blockchain payment recording error:', error);
            throw new Error('Failed to record payment on blockchain');
        }
    }

    // Record escrow transaction
    async recordEscrowTransaction(escrowData) {
        try {
            const {
                paymentId,
                orderId,
                buyerId,
                sellerId,
                amount,
                currency = 'INR',
                escrowType = 'order_escrow'
            } = escrowData;

            const transactionHash = this.generateTransactionHash({
                type: 'escrow',
                escrowType,
                paymentId,
                orderId,
                buyerId,
                sellerId,
                amount,
                currency
            });

            const blockNumber = this.generateBlockNumber();

            const blockchainTx = new BlockchainTransaction({
                payment: paymentId,
                transactionHash,
                blockNumber,
                fromAddress: buyerId.toString(),
                toAddress: sellerId.toString(),
                amount,
                currency,
                transactionType: 'escrow',
                status: 'confirmed',
                network: this.network,
                contractAddress: this.contractAddress,
                metadata: {
                    orderId,
                    escrowType,
                    chainId: this.chainId
                }
            });

            await blockchainTx.save();

            return {
                transactionHash,
                blockNumber,
                status: 'confirmed',
                escrowType,
                network: this.network
            };
        } catch (error) {
            console.error('Blockchain escrow recording error:', error);
            throw new Error('Failed to record escrow on blockchain');
        }
    }

    // Record refund transaction
    async recordRefundTransaction(refundData) {
        try {
            const {
                refundId,
                paymentId,
                orderId,
                buyerId,
                sellerId,
                amount,
                currency = 'INR',
                reason
            } = refundData;

            const transactionHash = this.generateTransactionHash({
                type: 'refund',
                refundId,
                paymentId,
                orderId,
                buyerId,
                sellerId,
                amount,
                currency,
                reason
            });

            const blockNumber = this.generateBlockNumber();

            const blockchainTx = new BlockchainTransaction({
                payment: paymentId,
                transactionHash,
                blockNumber,
                fromAddress: sellerId.toString(),
                toAddress: buyerId.toString(),
                amount,
                currency,
                transactionType: 'refund',
                status: 'confirmed',
                network: this.network,
                contractAddress: this.contractAddress,
                metadata: {
                    refundId,
                    orderId,
                    reason,
                    chainId: this.chainId
                }
            });

            await blockchainTx.save();

            return {
                transactionHash,
                blockNumber,
                status: 'confirmed',
                refundId,
                network: this.network
            };
        } catch (error) {
            console.error('Blockchain refund recording error:', error);
            throw new Error('Failed to record refund on blockchain');
        }
    }

    // Verify transaction on blockchain
    async verifyTransaction(transactionHash) {
        try {
            const transaction = await BlockchainTransaction.findOne({ transactionHash });

            if (!transaction) {
                return { verified: false, reason: 'Transaction not found' };
            }

            // In production, this would verify against actual blockchain
            const isValid = this.verifyTransactionIntegrity(transaction);

            return {
                verified: isValid,
                transaction: {
                    hash: transaction.transactionHash,
                    blockNumber: transaction.blockNumber,
                    status: transaction.status,
                    network: transaction.network,
                    timestamp: transaction.createdAt
                }
            };
        } catch (error) {
            console.error('Transaction verification error:', error);
            return { verified: false, reason: 'Verification failed' };
        }
    }

    // Verify transaction integrity
    verifyTransactionIntegrity(transaction) {
        try {
            const dataToVerify = {
                payment: transaction.payment?.toString(),
                transactionHash: transaction.transactionHash,
                blockNumber: transaction.blockNumber,
                fromAddress: transaction.fromAddress,
                toAddress: transaction.toAddress,
                amount: transaction.amount,
                currency: transaction.currency,
                transactionType: transaction.transactionType
            };

            const expectedHash = this.generateTransactionHash(dataToVerify);
            return expectedHash === transaction.transactionHash;
        } catch (error) {
            console.error('Transaction integrity check failed:', error);
            return false;
        }
    }

    // Get transaction history for a user
    async getTransactionHistory(userId, filters = {}) {
        try {
            const query = {
                $or: [
                    { fromAddress: userId.toString() },
                    { toAddress: userId.toString() }
                ]
            };

            if (filters.transactionType) {
                query.transactionType = filters.transactionType;
            }

            if (filters.status) {
                query.status = filters.status;
            }

            const transactions = await BlockchainTransaction.find(query)
                .populate('payment', 'amount currency status')
                .sort({ createdAt: -1 })
                .limit(filters.limit || 50);

            return transactions.map(tx => ({
                transactionHash: tx.transactionHash,
                blockNumber: tx.blockNumber,
                fromAddress: tx.fromAddress,
                toAddress: tx.toAddress,
                amount: tx.amount,
                currency: tx.currency,
                transactionType: tx.transactionType,
                status: tx.status,
                network: tx.network,
                timestamp: tx.createdAt,
                explorerUrl: this.getExplorerUrl(tx.transactionHash),
                payment: tx.payment
            }));
        } catch (error) {
            console.error('Get transaction history error:', error);
            throw new Error('Failed to fetch transaction history');
        }
    }

    // Get blockchain explorer URL
    getExplorerUrl(transactionHash) {
        const explorers = {
            'polygon': `https://polygonscan.com/tx/${transactionHash}`,
            'ethereum': `https://etherscan.io/tx/${transactionHash}`,
            'bsc': `https://bscscan.com/tx/${transactionHash}`,
            'polygon-testnet': `https://mumbai.polygonscan.com/tx/${transactionHash}`
        };
        return explorers[this.network] || explorers['polygon'];
    }

    // Get network statistics
    async getNetworkStats() {
        try {
            const totalTransactions = await BlockchainTransaction.countDocuments();
            const confirmedTransactions = await BlockchainTransaction.countDocuments({ status: 'confirmed' });
            const totalVolume = await BlockchainTransaction.aggregate([
                { $match: { status: 'confirmed' } },
                { $group: { _id: null, total: { $sum: '$amount' } } }
            ]);

            return {
                network: this.network,
                chainId: this.chainId,
                contractAddress: this.contractAddress,
                totalTransactions,
                confirmedTransactions,
                totalVolume: totalVolume[0]?.total || 0,
                successRate: totalTransactions > 0 ? (confirmedTransactions / totalTransactions) * 100 : 0
            };
        } catch (error) {
            console.error('Get network stats error:', error);
            throw new Error('Failed to fetch network statistics');
        }
    }
}

module.exports = new BlockchainService();