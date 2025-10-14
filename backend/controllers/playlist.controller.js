const { songs } = require('../models/song.model');

// Placeholder for playlist controller logic

exports.generatePlaylist = (req, res) => {
  const { mood } = req.body;
  console.log(`Generating playlist for mood: ${mood}`);

  // Simple logic to find songs that match the mood
  const moodSongs = songs.filter(song => song.mood_tags.includes(mood.toLowerCase()));

  if (moodSongs.length === 0) {
    return res.status(404).json({ msg: `No songs found for mood: ${mood}` });
  }

  // Return a subset of songs (e.g., up to 5)
  const playlist = moodSongs.slice(0, 5);

  res.json({ playlist });
};

exports.sharePlaylist = (req, res) => {
  const { playlistId, platform } = req.body;
  console.log(`Sharing playlist ${playlistId} on ${platform}`);
  res.json({ msg: 'Playlist shared successfully (placeholder)' });
};

exports.exportPlaylist = (req, res) => {
  const { playlistId } = req.body;
  console.log(`Exporting playlist ${playlistId}`);
  res.json({ msg: 'Playlist exported successfully (placeholder)' });
};

exports.songFeedback = (req, res) => {
  const { songId, action } = req.body; // action can be 'like' or 'skip'
  console.log(`User performed action '${action}' on song ${songId}`);
  res.json({ msg: 'Feedback received (placeholder)' });
};
