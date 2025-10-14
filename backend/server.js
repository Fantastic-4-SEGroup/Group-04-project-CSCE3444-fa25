const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Routes
app.get('/', (req, res) => {
  res.send('MoodSync\'d API is running...');
});

// Placeholder routes for the application features
app.use('/api/auth', require('./routes/auth.routes'));
app.use('/api/playlists', require('./routes/playlist.routes'));
app.use('/api/user', require('./routes/user.routes'));
app.use('/api/guest', require('./routes/guest.routes'));

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => console.log(`Server started on port ${PORT}`));

