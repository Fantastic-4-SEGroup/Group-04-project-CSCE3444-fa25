const express = require('express');
const router = express.Router();
const playlistController = require('../controllers/playlist.controller');

// @route   POST api/playlists/generate
// @desc    Generate a playlist based on mood
// @access  Private
router.post('/generate', playlistController.generatePlaylist);

// @route   POST api/playlists/share
// @desc    Share a playlist
// @access  Private
router.post('/share', playlistController.sharePlaylist);

// @route   POST api/playlists/export
// @desc    Export a playlist
// @access  Private
router.post('/export', playlistController.exportPlaylist);

// @route   PUT api/playlists/feedback
// @desc    Like/dislike a song in a playlist
// @access  Private
router.put('/feedback', playlistController.songFeedback);


module.exports = router;
