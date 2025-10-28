const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const {
    getCart,
    addToCart,
    updateCartItem,
    removeFromCart,
    clearCart
} = require('../controllers');

// All cart routes require authentication
router.use(authenticateToken);

// Get user's cart
router.get('/', getCart);

// Add item to cart
router.post('/', addToCart);

// Update cart item quantity
router.put('/:productId', updateCartItem);

// Remove item from cart
router.delete('/:productId', removeFromCart);

// Clear entire cart
router.delete('/', clearCart);

module.exports = router;