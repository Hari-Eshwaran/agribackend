const express = require('express');
const router = express.Router();
const { authenticateToken, authorizeRoles } = require('../middleware/auth');
const {
    getCategories,
    createCategory,
    updateCategory,
    deleteCategory
} = require('../controllers');

// Get all categories (public)
router.get('/', getCategories);

// Admin only routes
router.use(authenticateToken);
router.use(authorizeRoles('admin'));

// Create category
router.post('/', createCategory);

// Update category
router.put('/:id', updateCategory);

// Delete category
router.delete('/:id', deleteCategory);

module.exports = router;