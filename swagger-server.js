const express = require('express');
const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');
const cors = require('cors');
const { createProxyMiddleware } = require('http-proxy-middleware');
require('dotenv').config();

const app = express();
const PORT = process.env.SWAGGER_PORT || 5000;

// CORS configuration
app.use(cors({
    origin: true,
    credentials: true
}));

// Swagger definition
const swaggerDefinition = {
    openapi: '3.0.0',
    info: {
        title: 'AgriSmart Marketplace API',
        version: '1.0.0',
        description: 'Complete marketplace API for AgriSmart platform with products, orders, cart, wishlist, reviews, and analytics',
        contact: {
            name: 'AgriSmart Team',
            email: 'support@agrismart.com'
        },
    },
    servers: [
        {
            url: 'http://localhost:3002',
            description: 'Development server',
        },
    ],
    components: {
        securitySchemes: {
            bearerAuth: {
                type: 'http',
                scheme: 'bearer',
                bearerFormat: 'JWT',
            },
        },
        schemas: {
            User: {
                type: 'object',
                properties: {
                    _id: { type: 'string' },
                    name: { type: 'string' },
                    email: { type: 'string' },
                    role: { type: 'string', enum: ['buyer', 'farmer', 'admin'] },
                    avatar: { type: 'string' },
                    farmerProfile: {
                        type: 'object',
                        properties: {
                            businessName: { type: 'string' },
                            location: { type: 'string' },
                            description: { type: 'string' }
                        }
                    }
                }
            },
            Product: {
                type: 'object',
                properties: {
                    _id: { type: 'string' },
                    name: { type: 'string' },
                    description: { type: 'string' },
                    price: { type: 'number' },
                    category: { type: 'string' },
                    stock: { type: 'number' },
                    images: { type: 'array', items: { type: 'string' } },
                    organic: { type: 'boolean' },
                    rating: { type: 'number' },
                    seller: { $ref: '#/components/schemas/User' },
                    createdAt: { type: 'string', format: 'date-time' }
                }
            },
            Order: {
                type: 'object',
                properties: {
                    _id: { type: 'string' },
                    buyer: { $ref: '#/components/schemas/User' },
                    seller: { $ref: '#/components/schemas/User' },
                    items: {
                        type: 'array',
                        items: {
                            type: 'object',
                            properties: {
                                product: { $ref: '#/components/schemas/Product' },
                                quantity: { type: 'number' },
                                price: { type: 'number' },
                                total: { type: 'number' }
                            }
                        }
                    },
                    totalAmount: { type: 'number' },
                    status: {
                        type: 'string',
                        enum: ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled']
                    },
                    deliveryAddress: {
                        type: 'object',
                        properties: {
                            street: { type: 'string' },
                            city: { type: 'string' },
                            state: { type: 'string' },
                            zipCode: { type: 'string' },
                            country: { type: 'string' }
                        }
                    },
                    createdAt: { type: 'string', format: 'date-time' }
                }
            },
            CartItem: {
                type: 'object',
                properties: {
                    product: { $ref: '#/components/schemas/Product' },
                    quantity: { type: 'number' },
                    total: { type: 'number' }
                }
            },
            Review: {
                type: 'object',
                properties: {
                    _id: { type: 'string' },
                    user: { $ref: '#/components/schemas/User' },
                    product: { $ref: '#/components/schemas/Product' },
                    order: { type: 'string' },
                    rating: { type: 'number', minimum: 1, maximum: 5 },
                    title: { type: 'string' },
                    comment: { type: 'string' },
                    images: { type: 'array', items: { type: 'string' } },
                    isVerified: { type: 'boolean' },
                    createdAt: { type: 'string', format: 'date-time' }
                }
            },
            Category: {
                type: 'object',
                properties: {
                    _id: { type: 'string' },
                    name: { type: 'string' },
                    slug: { type: 'string' },
                    description: { type: 'string' },
                    image: { type: 'string' },
                    parent: { type: 'string' },
                    sortOrder: { type: 'number' },
                    isActive: { type: 'boolean' }
                }
            },
            Notification: {
                type: 'object',
                properties: {
                    _id: { type: 'string' },
                    user: { $ref: '#/components/schemas/User' },
                    type: { type: 'string', enum: ['order', 'product', 'system'] },
                    title: { type: 'string' },
                    message: { type: 'string' },
                    data: { type: 'object' },
                    isRead: { type: 'boolean' },
                    readAt: { type: 'string', format: 'date-time' },
                    createdAt: { type: 'string', format: 'date-time' }
                }
            }
        }
    },
    security: [
        {
            bearerAuth: [],
        },
    ],
};

// Swagger options
const options = {
    swaggerDefinition,
    apis: ['./swagger/*.js'], // Path to the API docs
};

// Initialize swagger-jsdoc
const specs = swaggerJsdoc(options);

// Serve Swagger UI
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(specs, {
    explorer: true,
    swaggerOptions: {
        persistAuthorization: true,
        displayRequestDuration: true,
        docExpansion: 'none',
        filter: true,
        showExtensions: true,
        showCommonExtensions: true,
        syntaxHighlight: {
            activate: true,
            theme: 'arta'
        }
    }
}));

// Proxy API requests to the main server
app.use('/api', createProxyMiddleware({
    target: 'http://localhost:3002',
    changeOrigin: true,
    pathRewrite: {
        '^/api': '/api' // Keep the /api prefix
    },
    onProxyReq: (proxyReq, req, res) => {
        // Add CORS headers for preflight requests
        if (req.method === 'OPTIONS') {
            res.setHeader('Access-Control-Allow-Origin', '*');
            res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
            res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
        }
    }
}));

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({
        status: 'OK',
        service: 'AgriSmart Swagger Server',
        port: PORT,
        apiServer: 'http://localhost:3002',
        timestamp: new Date().toISOString()
    });
});

// Root endpoint
app.get('/', (req, res) => {
    res.redirect('/api-docs');
});

// Start server
app.listen(PORT, () => {
    console.log(`🚀 AgriSmart Swagger Server running on port ${PORT}`);
    console.log(`📖 API Documentation: http://localhost:${PORT}/api-docs`);
    console.log(`🔗 Main API Server: http://localhost:3002`);
    console.log(`💡 Health Check: http://localhost:${PORT}/health`);
});

module.exports = app;