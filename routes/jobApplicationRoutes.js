const express = require('express');
const router = express.Router();
const {
  applyForJob,
  getJobApplications,
  getMyApplications,
  updateApplicationStatus,
  withdrawApplication,
} = require('../controllers/jobApplicationController');
const { protect } = require('../middleware/auth');

// Artisan routes
router.post('/:jobId/apply', protect, applyForJob);
router.get('/my-applications', protect, getMyApplications);
router.delete('/applications/:applicationId', protect, withdrawApplication);

// Customer routes
router.get('/:jobId/applications', protect, getJobApplications);
router.put('/applications/:applicationId', protect, updateApplicationStatus);

module.exports = router;
