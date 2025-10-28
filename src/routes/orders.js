const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const {
    getOrders,
    getOrderById,
    createOrder,
    updateOrderStatus,
    cancelOrder
} = require('../controllers/index');

// All order routes require authentication
router.use(authenticateToken);

router.get('/', getOrders);
router.get('/:id', getOrderById);
router.post('/', createOrder);
router.put('/:id/status', updateOrderStatus);
router.put('/:id/cancel', cancelOrder);

module.exports = router;