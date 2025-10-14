const express = require('express');
const router = express.Router();
const guestController = require('../controllers/guest.controller');

// @route   POST api/guest/preview
// @desc    Generate a preview playlist for a guest
// @access  Public
router.post('/preview', guestController.generatePreview);

module.exports = router;
