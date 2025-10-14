// Placeholder for Song model

const SongSchema = {
  title: 'string',
  artist: 'string',
  genre: 'string',
  mood_tags: ['string'],
};

// Mock data for preloaded songs
const songs = [
  { id: '1', title: 'Weightless', artist: 'Marconi Union', genre: 'Ambient', mood_tags: ['calm'] },
  { id: '2', title: 'Happy', artist: 'Pharrell Williams', genre: 'Pop', mood_tags: ['joyful', 'energetic'] },
  { id: '3', title: 'Bohemian Rhapsody', artist: 'Queen', genre: 'Rock', mood_tags: ['energetic'] },
  { id: '4', title: 'Someone Like You', artist: 'Adele', genre: 'Pop', mood_tags: ['nostalgic'] },
  { id: '5', title: 'Clair de Lune', artist: 'Claude Debussy', genre: 'Classical', mood_tags: ['calm', 'nostalgic'] },
];

module.exports = { SongSchema, songs };
