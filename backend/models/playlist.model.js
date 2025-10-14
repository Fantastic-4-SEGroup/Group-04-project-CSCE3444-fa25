// Placeholder for Playlist model

const PlaylistSchema = {
  user_id: 'string', // or ObjectId
  mood: 'string',
  songs: ['string'], // Array of song IDs
  created_at: 'date',
};

// Mock data
const playlists = [];

module.exports = { PlaylistSchema, playlists };
