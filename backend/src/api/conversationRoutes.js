const express = require('express');
const router = express.Router();
const convController = require('../controllers/conversationController');
const { protect } = require('../middleware/authMiddleware');

router.route('/')
    .get(protect, convController.listConversations)
    .post(protect, convController.createConversation);

router.route('/:conversationId')
    .delete(protect, convController.deleteConversation); // Phương thức DELETE

// === THÊM ROUTE MỚI ===
router.route('/:conversationId/messages')
    .get(protect, convController.getConversationMessages);


module.exports = router;