const express = require('express');
const router = express.Router();
const {
  getConversations,
  getMessages,
  sendMessage,
  markAsRead,
  getUnreadCount,
} = require('../controllers/messageController');
const { protect } = require('../middleware/auth');

router.get('/conversations', protect, getConversations);
router.get('/conversation/:userId', protect, getMessages);
router.post('/send', protect, sendMessage);
router.put('/read/:conversationId', protect, markAsRead);
router.get('/unread-count', protect, getUnreadCount);

module.exports = router;
