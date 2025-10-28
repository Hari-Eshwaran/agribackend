const express = require('express');
const {
    getCurrentWeather,
    getWeatherForecast,
    getWeatherHistory,
    getWeatherAlerts,
    subscribeWeatherAlerts,
    unsubscribeWeatherAlerts
} = require('../controllers/index');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Public routes (no auth required)
router.get('/current', getCurrentWeather);
router.get('/forecast', getWeatherForecast);
router.get('/history', getWeatherHistory);
router.get('/alerts', getWeatherAlerts);

// Protected routes (auth required)
router.post('/subscribe-alerts', authenticateToken, subscribeWeatherAlerts);
router.delete('/unsubscribe-alerts', authenticateToken, unsubscribeWeatherAlerts);

module.exports = router;