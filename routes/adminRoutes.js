const express = require('express');
const router = express.Router();
const {
  adminLogin,
  verifyAdmin,
  adminLogout,
  getDashboardStats,
  debugDatabase
} = require('../controllers/adminController');
const { protect, authorize } = require('../middleware/auth');

// Admin authentication routes
router.post('/login', adminLogin);
router.get('/verify', protect, authorize('admin'), verifyAdmin);
router.post('/logout', protect, authorize('admin'), adminLogout);

// Admin dashboard routes
router.get('/stats', protect, authorize('admin'), getDashboardStats);
router.get('/debug', protect, authorize('admin'), debugDatabase);

module.exports = router;