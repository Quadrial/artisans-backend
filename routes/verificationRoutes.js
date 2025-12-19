const express = require('express');
const router = express.Router();
const {
  initiateVerification,
  handleWebhook,
  getVerificationStatus,
  submitDocuments,
  simulateVerificationComplete,
  resetVerification,
  verifyBlockchainHash,
  getAllVerifications,
  getPendingVerifications,
  reviewVerification,
  getWalletStatus
} = require('../controllers/verificationController');
const { protect, authorize } = require('../middleware/auth');

// User verification routes
router.post('/initiate', protect, initiateVerification);
router.get('/status', protect, getVerificationStatus);
router.post('/submit-documents', protect, submitDocuments);
router.post('/simulate-complete', protect, simulateVerificationComplete);
router.post('/reset', protect, resetVerification);

// Webhook route (public but secured with signature verification)
router.post('/webhook', handleWebhook);

// Admin routes
router.get('/admin/pending', protect, authorize('admin'), getPendingVerifications);
router.post('/admin/review', protect, authorize('admin'), reviewVerification);
router.post('/verify-blockchain', protect, authorize('admin'), verifyBlockchainHash);
router.get('/admin/all', protect, authorize('admin'), getAllVerifications);
router.get('/admin/wallet-status', protect, authorize('admin'), getWalletStatus);

module.exports = router;