const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const {
    getWishlist,
    addToWishlist,
    removeFromWishlist,
    checkWishlistStatus
} = require('../controllers');

// All wishlist routes require authentication
router.use(authenticateToken);

// Get user's wishlist
router.get('/', getWishlist);

// Add product to wishlist
router.post('/', addToWishlist);

// Remove product from wishlist
router.delete('/:productId', removeFromWishlist);

// Check if product is in wishlist
router.get('/:productId/status', checkWishlistStatus);

module.exports = router;