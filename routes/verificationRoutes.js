const express = require('express');
const router = express.Router();
const {
  initiateVerification,
  handleWebhook,
  getVerificationStatus,
  resetVerification,
  verifyBlockchainHash,
  getAllVerifications
} = require('../controllers/verificationController');
const { protect, authorize } = require('../middleware/auth');

// User verification routes
router.post('/initiate', protect, initiateVerification);
router.get('/status', protect, getVerificationStatus);
router.post('/reset', protect, resetVerification);

// Webhook route (public but secured with signature verification)
router.post('/webhook', handleWebhook);

// Admin routes
router.post('/verify-blockchain', protect, authorize('admin'), verifyBlockchainHash);
router.get('/admin/all', protect, authorize('admin'), getAllVerifications);

module.exports = router;