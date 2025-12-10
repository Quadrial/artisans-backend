const express = require('express');
const router = express.Router();
const {
  getArtisans,
  getArtisanById,
  getSkills,
  getLocations,
} = require('../controllers/artisanController');
const { optionalAuth } = require('../middleware/auth');

router.get('/', optionalAuth, getArtisans);
router.get('/skills/list', getSkills);
router.get('/locations/list', getLocations);
router.get('/:id', getArtisanById);

module.exports = router;
