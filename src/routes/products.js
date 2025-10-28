const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const {
    getProducts,
    getProductById,
    createProduct,
    updateProduct,
    deleteProduct
} = require('../controllers/index');

// Public routes
router.get('/', getProducts);
router.get('/:id', getProductById);

// Protected routes (require authentication)
router.post('/', authenticateToken, createProduct);
router.put('/:id', authenticateToken, updateProduct);
router.delete('/:id', authenticateToken, deleteProduct);

module.exports = router;