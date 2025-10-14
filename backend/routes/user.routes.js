const express = require('express');
const router = express.Router();
const userController = require('../controllers/user.controller');

// @route   PUT api/user/preferences
// @desc    Set user genre preferences
// @access  Private
router.put('/preferences', userController.setPreferences);

// @route   GET api/user/calendar
// @desc    Get user's mood calendar
// @access  Private
router.get('/calendar', userController.getCalendar);

// @route   PUT api/user/parental-controls
// @desc    Set parental controls for a child account
// @access  Private
router.put('/parental-controls', userController.setParentalControls);

module.exports = router;
