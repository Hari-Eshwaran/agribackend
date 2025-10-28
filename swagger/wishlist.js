/**
 * @swagger
 * /api/wishlist:
 *   get:
 *     tags:
 *       - Wishlist
 *     summary: Get user's wishlist
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Wishlist retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       _id:
 *                         type: string
 *                         example: "60d5ecb74b24c72b8c8b4567"
 *                       user:
 *                         type: string
 *                         example: "60d5ecb74b24c72b8c8b4567"
 *                       product:
 *                         $ref: '#/components/schemas/Product'
 *                       addedAt:
 *                         type: string
 *                         format: date-time
 *                         example: "2023-10-26T10:30:00.000Z"
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 *
 *   post:
 *     tags:
 *       - Wishlist
 *     summary: Add product to wishlist
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - productId
 *             properties:
 *               productId:
 *                 type: string
 *                 example: "60d5ecb74b24c72b8c8b4567"
 *     responses:
 *       201:
 *         description: Product added to wishlist successfully
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
 *                     _id:
 *                       type: string
 *                       example: "60d5ecb74b24c72b8c8b4567"
 *                     user:
 *                       type: string
 *                       example: "60d5ecb74b24c72b8c8b4567"
 *                     product:
 *                       $ref: '#/components/schemas/Product'
 *                     addedAt:
 *                       type: string
 *                       format: date-time
 *                       example: "2023-10-26T10:30:00.000Z"
 *       400:
 *         description: Bad request - Product not found or already in wishlist
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */

/**
 * @swagger
 * /api/wishlist/{productId}:
 *   delete:
 *     tags:
 *       - Wishlist
 *     summary: Remove product from wishlist
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: productId
 *         required: true
 *         schema:
 *           type: string
 *         description: Product ID
 *     responses:
 *       200:
 *         description: Product removed from wishlist successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Removed from wishlist"
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Item not found in wishlist
 *       500:
 *         description: Server error
 */

/**
 * @swagger
 * /api/wishlist/{productId}/status:
 *   get:
 *     tags:
 *       - Wishlist
 *     summary: Check if product is in wishlist
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: productId
 *         required: true
 *         schema:
 *           type: string
 *         description: Product ID
 *     responses:
 *       200:
 *         description: Wishlist status checked successfully
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
 *                     isInWishlist:
 *                       type: boolean
 *                       example: true
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */