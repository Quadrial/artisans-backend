const express = require('express');
const router = express.Router();
const {
  getProfile,
  updateProfile,
  uploadProfilePhoto,
} = require('../controllers/profileController');
const { protect } = require('../middleware/auth');

// All routes are protected (require authentication)
router.get('/', protect, getProfile);
router.put('/', protect, updateProfile);
router.post('/upload-photo', protect, uploadProfilePhoto);

module.exports = router;
