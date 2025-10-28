const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const {
    getNotifications,
    markNotificationAsRead,
    markAllNotificationsAsRead,
    deleteNotification
} = require('../controllers');

// All notification routes require authentication
router.use(authenticateToken);

// Get user's notifications
router.get('/', getNotifications);

// Mark notification as read
router.put('/:id/read', markNotificationAsRead);

// Mark all notifications as read
router.put('/read-all', markAllNotificationsAsRead);

// Delete notification
router.delete('/:id', deleteNotification);

module.exports = router;