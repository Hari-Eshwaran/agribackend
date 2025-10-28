const express = require('express');
const { body } = require('express-validator');
const {
    getProfile,
    updateProfile,
    uploadAvatar,
    deleteAvatar,
    updatePreferences
} = require('../controllers/index');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Validation rules
const updateProfileValidation = [
    body('name').optional().trim().isLength({ min: 2, max: 50 }).withMessage('Name must be 2-50 characters'),
    body('email').optional().isEmail().normalizeEmail().withMessage('Valid email required')
];

// All user routes require authentication
router.use(authenticateToken);

// Profile routes
router.get('/profile', getProfile);
router.put('/profile', updateProfileValidation, updateProfile);

// Avatar routes
router.post('/avatar', uploadAvatar);
router.delete('/avatar', deleteAvatar);

// Preferences
router.put('/preferences', updatePreferences);

module.exports = router;