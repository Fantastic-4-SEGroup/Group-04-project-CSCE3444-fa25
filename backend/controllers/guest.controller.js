const { songs } = require('../models/song.model');

// Placeholder for guest controller logic

exports.generatePreview = (req, res) => {
  const { mood } = req.body;
  console.log(`Generating preview playlist for mood: ${mood}`);

  const moodSongs = songs.filter(song => song.mood_tags.includes(mood.toLowerCase()));

  if (moodSongs.length === 0) {
    return res.status(404).json({ msg: `No songs found for mood: ${mood}` });
  }

  const playlist = moodSongs.slice(0, 1); // Guest gets one song

  res.json({ playlist });
};
