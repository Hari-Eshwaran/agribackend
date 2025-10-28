# AgriSmart Marketplace API - Swagger Documentation

## 🚀 Quick Start

### Start the Main API Server (Port 3002)
```bash
cd backend-server
npm run dev
```

### Start the Swagger Documentation Server (Port 5000)
```bash
cd backend-server
npm run swagger
# or for development with auto-reload
npm run swagger:dev
```

## 📖 Access Swagger UI

Open your browser and navigate to:
**http://localhost:5000/api-docs**

## 🔧 Features

### Interactive API Testing
- **Try it out** buttons for all endpoints
- Real-time request/response testing
- JWT token authentication support
- Request/response examples

### Complete API Coverage
- **Authentication**: Register, login, profile management
- **Products**: CRUD operations, search, filtering
- **Cart**: Add, update, remove items
- **Wishlist**: Manage favorite products
- **Reviews**: Product reviews and ratings
- **Orders**: Order management and tracking
- **Deliveries**: Delivery status updates
- **Categories**: Product categorization
- **Notifications**: User notifications
- **Analytics**: Seller and buyer insights

### Proxy Integration
- All API calls are proxied to the main server (port 3002)
- Real database interactions
- CORS enabled for frontend integration

## 🔐 Authentication

1. **Register/Login** using the Auth endpoints
2. **Copy the JWT token** from the response
3. **Click "Authorize"** button in Swagger UI
4. **Enter**: `Bearer YOUR_JWT_TOKEN`
5. **Test authenticated endpoints**

## 📊 Available Endpoints

### Public Endpoints (No Auth Required)
- `GET /api/categories` - Get all categories
- `GET /api/products` - Get products (with filtering)
- `GET /api/products/{id}` - Get product details
- `GET /api/reviews/product/{productId}` - Get product reviews

### Protected Endpoints (JWT Required)
- **Cart Management**: `/api/cart/*`
- **Wishlist**: `/api/wishlist/*`
- **Orders**: `/api/orders/*`
- **Reviews**: `/api/reviews/*` (create/update/delete)
- **Analytics**: `/api/analytics/*`
- **Notifications**: `/api/notifications/*`

## 🛠️ Development

### Adding New API Documentation
1. Create new file in `swagger/` directory
2. Use JSDoc comments with Swagger annotations
3. Restart swagger server

### File Structure
```
backend-server/
├── swagger-server.js          # Main swagger server
├── swagger/                   # API documentation files
│   ├── auth.js               # Authentication endpoints
│   ├── products.js           # Product management
│   ├── cart.js               # Cart operations
│   ├── wishlist.js           # Wishlist management
│   ├── reviews.js            # Review system
│   └── analytics.js          # Analytics endpoints
└── package.json              # Updated with swagger scripts
```

## 🔗 Integration

The swagger server proxies all `/api/*` requests to `http://localhost:3002`, so you can:
- Test APIs directly in Swagger UI
- Use the same endpoints in your frontend
- Debug API responses in real-time
- Validate request/response formats

## 📝 Environment Variables

Create a `.env` file in `backend-server/` directory:
```env
PORT=3002
SWAGGER_PORT=5000
MONGODB_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret
```

## 🚨 Troubleshooting

### Server Won't Start
- Check if ports 3002 and 5000 are available
- Ensure MongoDB is running
- Check console for error messages

### API Calls Fail
- Verify main API server (port 3002) is running
- Check JWT token is valid and properly formatted
- Ensure request body matches schema requirements

### CORS Issues
- Swagger server has CORS enabled
- Check frontend is accessing correct port (5000 for docs, 3002 for direct API calls)

---

**Happy API Testing! 🎉**