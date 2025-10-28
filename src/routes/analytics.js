const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const {
    getSellerAnalytics,
    getBuyerAnalytics,
    getProductAnalytics
} = require('../controllers');

// All analytics routes require authentication
router.use(authenticateToken);

// Seller analytics
router.get('/seller', getSellerAnalytics);

// Buyer analytics
router.get('/buyer', getBuyerAnalytics);

// Product analytics
router.get('/product/:productId', getProductAnalytics);

module.exports = router;