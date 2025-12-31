const express = require('express');
const router = express.Router();
const {
  getProfile,
  getUserProfile,
  updateProfile,
  uploadProfilePhoto,
} = require('../controllers/profileController');
const { protect } = require('../middleware/auth');

// All routes are protected (require authentication)
router.get('/', protect, getProfile);
router.get('/user/:userId', protect, getUserProfile);
router.put('/', protect, updateProfile);
router.post('/upload-photo', protect, uploadProfilePhoto);

module.exports = router;
