/**
 * @swagger
 * /api/analytics/seller:
 *   get:
 *     tags:
 *       - Analytics
 *     summary: Get seller analytics
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: period
 *         schema:
 *           type: string
 *           enum: [7d, 30d, 90d, 1y]
 *           default: 30d
 *         description: Time period for analytics
 *     responses:
 *       200:
 *         description: Seller analytics retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     period:
 *                       type: string
 *                       example: "30d"
 *                     overview:
 *                       type: object
 *                       properties:
 *                         totalOrders:
 *                           type: integer
 *                           example: 25
 *                         totalRevenue:
 *                           type: number
 *                           example: 1250.50
 *                         completedOrders:
 *                           type: integer
 *                           example: 22
 *                         completionRate:
 *                           type: string
 *                           example: "88.0"
 *                     products:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           productId:
 *                             type: string
 *                             example: "60d5ecb74b24c72b8c8b4567"
 *                           productName:
 *                             type: string
 *                             example: "Organic Tomatoes"
 *                           totalSold:
 *                             type: integer
 *                             example: 50
 *                           revenue:
 *                             type: number
 *                             example: 750.00
 *                           orders:
 *                             type: integer
 *                             example: 15
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */

/**
 * @swagger
 * /api/analytics/buyer:
 *   get:
 *     tags:
 *       - Analytics
 *     summary: Get buyer analytics
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: period
 *         schema:
 *           type: string
 *           enum: [7d, 30d, 90d, 1y]
 *           default: 30d
 *         description: Time period for analytics
 *     responses:
 *       200:
 *         description: Buyer analytics retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     period:
 *                       type: string
 *                       example: "30d"
 *                     overview:
 *                       type: object
 *                       properties:
 *                         totalOrders:
 *                           type: integer
 *                           example: 8
 *                         totalSpent:
 *                           type: number
 *                           example: 425.75
 *                         completedOrders:
 *                           type: integer
 *                           example: 7
 *                         completionRate:
 *                           type: string
 *                           example: "87.5"
 *                     categories:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           category:
 *                             type: string
 *                             example: "vegetables"
 *                           itemsPurchased:
 *                             type: integer
 *                             example: 25
 *                           amountSpent:
 *                             type: number
 *                             example: 125.50
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */

/**
 * @swagger
 * /api/analytics/product/{productId}:
 *   get:
 *     tags:
 *       - Analytics
 *     summary: Get product analytics
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: productId
 *         required: true
 *         schema:
 *           type: string
 *         description: Product ID
 *       - in: query
 *         name: period
 *         schema:
 *           type: string
 *           enum: [7d, 30d, 90d, 1y]
 *           default: 30d
 *         description: Time period for analytics
 *     responses:
 *       200:
 *         description: Product analytics retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     productId:
 *                       type: string
 *                       example: "60d5ecb74b24c72b8c8b4567"
 *                     productName:
 *                       type: string
 *                       example: "Organic Tomatoes"
 *                     period:
 *                       type: string
 *                       example: "30d"
 *                     sales:
 *                       type: object
 *                       properties:
 *                         totalSold:
 *                           type: integer
 *                           example: 50
 *                         totalRevenue:
 *                           type: number
 *                           example: 750.00
 *                         uniqueBuyers:
 *                           type: integer
 *                           example: 12
 *                         ordersCount:
 *                           type: integer
 *                           example: 15
 *                     reviews:
 *                       type: object
 *                       properties:
 *                         totalReviews:
 *                           type: integer
 *                           example: 8
 *                         averageRating:
 *                           type: number
 *                           example: 4.2
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Product not found
 *       500:
 *         description: Server error
 */