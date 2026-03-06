// backend/src/api/chatRoutes.js
const express = require('express');
const router = express.Router();
const chatController = require('../controllers/chatController');
const { protect } = require('../middleware/authMiddleware');

// POST /api/chat
// Route này được bảo vệ, chỉ người dùng đã đăng nhập mới có thể chat
router.post('/', protect, chatController.handleChatMessage);
router.post('/:conversationId/messages', protect, chatController.handleChatMessage);


module.exports = router;