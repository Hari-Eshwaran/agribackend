const express = require('express');
const { body } = require('express-validator');
const {
    register,
    login,
    demoLogin,
    logout,
    refreshToken,
    getMe,
    forgotPassword,
    resetPassword,
    getRoles,
    assignRole,
    getUserRole
} = require('../controllers/index');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');

const router = express.Router();

// Validation rules
const registerValidation = [
    body('name').trim().isLength({ min: 2, max: 50 }).withMessage('Name must be 2-50 characters'),
    body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters')
];

const farmerRegisterValidation = [
    ...registerValidation,
    body('farmerProfile.farmName').optional().trim().isLength({ min: 2, max: 100 }).withMessage('Farm name must be 2-100 characters'),
    body('farmerProfile.farmSize').optional().trim().isLength({ min: 1, max: 50 }).withMessage('Farm size is required'),
    body('farmerProfile.location.city').optional().trim().isLength({ min: 2, max: 50 }).withMessage('City is required'),
    body('farmerProfile.contactNumber').optional().isMobilePhone().withMessage('Valid contact number required')
];

const buyerRegisterValidation = [
    ...registerValidation,
    body('buyerProfile.businessName').optional().trim().isLength({ min: 2, max: 100 }).withMessage('Business name must be 2-100 characters'),
    body('buyerProfile.businessType').optional().isIn(['individual', 'retail', 'wholesale', 'restaurant', 'cooperative']).withMessage('Invalid business type'),
    body('buyerProfile.deliveryAddress.city').optional().trim().isLength({ min: 2, max: 50 }).withMessage('City is required')
];

const loginValidation = [
    body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
    body('password').notEmpty().withMessage('Password is required')
];

const forgotPasswordValidation = [
    body('email').isEmail().normalizeEmail().withMessage('Valid email required')
];

const resetPasswordValidation = [
    body('token').notEmpty().withMessage('Reset token is required'),
    body('newPassword').isLength({ min: 6 }).withMessage('New password must be at least 6 characters')
];

// Public routes
router.post('/register', registerValidation, register);
router.post('/register/farmer', farmerRegisterValidation, (req, res, next) => {
    req.body.role = 'farmer';
    next();
}, register);
router.post('/register/buyer', buyerRegisterValidation, (req, res, next) => {
    req.body.role = 'buyer';
    next();
}, register);
router.post('/login', loginValidation, login);
router.post('/demo-login', demoLogin);
router.post('/logout', logout);
router.post('/refresh-token', refreshToken);
router.post('/forgot-password', forgotPasswordValidation, forgotPassword);
router.post('/reset-password', resetPasswordValidation, resetPassword);

// Protected routes
router.get('/me', authenticateToken, getMe);
router.get('/roles', authenticateToken, getRoles);
router.get('/user-role', authenticateToken, getUserRole);

// Admin only routes
router.post('/assign-role', authenticateToken, authorizeRoles('admin'), assignRole);

module.exports = router;