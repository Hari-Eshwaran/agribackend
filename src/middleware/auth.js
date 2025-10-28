const jwt = require('jsonwebtoken');
const { User } = require('../models/index');

const authenticateToken = async (req, res, next) => {
    try {
        const authHeader = req.headers['authorization'];
        const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

        if (!token) {
            return res.status(401).json({ message: 'Access token required' });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your_jwt_secret');
        
        // Check if this is a demo user
        if (decoded.userId.startsWith('demo_')) {
            // Extract role from demo user ID
            const role = decoded.userId.split('_')[1];
            req.user = {
                _id: decoded.userId,
                role: role,
                isActive: true,
                name: `${role.charAt(0).toUpperCase() + role.slice(1)} User`,
                email: `${role}@demo.agri`
            };
        } else {
            // Regular user - lookup in database
            const user = await User.findById(decoded.userId);

            if (!user) {
                return res.status(401).json({ message: 'User not found' });
            }

            if (!user.isActive) {
                return res.status(401).json({ message: 'Account is deactivated' });
            }

            req.user = user;
        }
        next();
    } catch (error) {
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({ message: 'Token expired' });
        }
        return res.status(403).json({ message: 'Invalid token' });
    }
};

const authorizeRoles = (...roles) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ message: 'Authentication required' });
        }

        if (!roles.includes(req.user.role)) {
            return res.status(403).json({ message: 'Insufficient permissions' });
        }

        next();
    };
};

const optionalAuth = async (req, res, next) => {
    try {
        const authHeader = req.headers['authorization'];
        const token = authHeader && authHeader.split(' ')[1];

        if (token) {
            const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your_jwt_secret');
            
            // Check if this is a demo user
            if (decoded.userId.startsWith('demo_')) {
                const role = decoded.userId.split('_')[1];
                req.user = {
                    _id: decoded.userId,
                    role: role,
                    isActive: true,
                    name: `${role.charAt(0).toUpperCase() + role.slice(1)} User`,
                    email: `${role}@demo.agri`
                };
            } else {
                // Regular user - lookup in database
                const user = await User.findById(decoded.userId);
                if (user && user.isActive) {
                    req.user = user;
                }
            }
        }
        next();
    } catch (error) {
        // Ignore auth errors for optional auth
        next();
    }
};

module.exports = {
    authenticateToken,
    authorizeRoles,
    optionalAuth
};