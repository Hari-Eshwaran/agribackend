const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const {
    getProductReviews,
    createReview,
    updateReview,
    deleteReview,
    getUserReviews
} = require('../controllers');

// Get product reviews (public)
router.get('/product/:productId', getProductReviews);

// All other review routes require authentication
router.use(authenticateToken);

// Create a review
router.post('/', createReview);

// Update a review
router.put('/:reviewId', updateReview);

// Delete a review
router.delete('/:reviewId', deleteReview);

// Get user's reviews
router.get('/user', getUserReviews);

module.exports = router;