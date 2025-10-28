const express = require('express');
const {
    getMarketPrices,
    getMarketPricesByCommodity,
    getMarketPriceHistory,
    getMarketTrends,
    getMarketAnalysis,
    createMarketPriceAlert,
    deleteMarketPriceAlert
} = require('../controllers/index');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Public routes (no auth required)
router.get('/prices', getMarketPrices);
router.get('/prices/:commodity', getMarketPricesByCommodity);
router.get('/prices/:commodity/history', getMarketPriceHistory);
router.get('/trends', getMarketTrends);
router.get('/analysis', getMarketAnalysis);

// Protected routes (auth required)
router.post('/price-alerts', authenticateToken, createMarketPriceAlert);
router.delete('/price-alerts/:alertId', authenticateToken, deleteMarketPriceAlert);

module.exports = router;