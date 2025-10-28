const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const {
    getDeliveries,
    getDeliveryById,
    updateDeliveryStatus,
    getDeliveryByTrackingId
} = require('../controllers/index');

// All delivery routes require authentication
router.use(authenticateToken);

router.get('/', getDeliveries);
router.get('/:id', getDeliveryById);
router.get('/track/:trackingId', getDeliveryByTrackingId);
router.put('/:id/status', updateDeliveryStatus);

module.exports = router;