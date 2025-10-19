/* Shared helpers */
const yearEl = document.getElementById('year');
if (yearEl) yearEl.textContent = new Date().getFullYear();

/* ------- INDEX PAGE LOGIC ------- */
const chips = document.querySelectorAll('.chip');
const generateBtn = document.getElementById('generateBtn');

let selectedMood = null;

chips.forEach(btn => {
  btn.addEventListener('click', () => {
    chips.forEach(c => c.classList.remove('is-selected'));
    btn.classList.add('is-selected');
    selectedMood = btn.dataset.mood;
    generateBtn.disabled = false;
  });
});

if (generateBtn) {
  generateBtn.addEventListener('click', () => {
    if (!selectedMood) return;
    // Save the selection then go to player page
    sessionStorage.setItem('guest_mood', selectedMood);
    window.location.href = 'player.html';
  });
}

/* ------- PLAYER PAGE LOGIC ------- */
/**
 * Define your moods and two song options each.
 * Replace the placeholder audio URLs + titles + cover images.
 * You can also swap <audio> for an embedded player (Spotify/YouTube) if you prefer.
 */
const moodLibrary = {
  mood1: [
    { title: 'Song A (Mood 1)', audio: 'song-a-mood1.mp3', cover: 'cover-a-mood1.jpg' }, // TODO: replace
    { title: 'Song B (Mood 1)', audio: 'song-b-mood1.mp3', cover: 'cover-b-mood1.jpg' }, // TODO: replace
  ],
  mood2: [
    { title: 'Song A (Mood 2)', audio: 'song-a-mood2.mp3', cover: 'cover-a-mood2.jpg' },
    { title: 'Song B (Mood 2)', audio: 'song-b-mood2.mp3', cover: 'cover-b-mood2.jpg' },
  ],
  mood3: [
    { title: 'Song A (Mood 3)', audio: 'song-a-mood3.mp3', cover: 'cover-a-mood3.jpg' },
    { title: 'Song B (Mood 3)', audio: 'song-b-mood3.mp3', cover: 'cover-b-mood3.jpg' },
  ],
  mood4: [
    { title: 'Song A (Mood 4)', audio: 'song-a-mood4.mp3', cover: 'cover-a-mood4.jpg' },
    { title: 'Song B (Mood 4)', audio: 'song-b-mood4.mp3', cover: 'cover-b-mood4.jpg' },
  ],
  mood5: [
    { title: 'Song A (Mood 5)', audio: 'song-a-mood5.mp3', cover: 'cover-a-mood5.jpg' },
    { title: 'Song B (Mood 5)', audio: 'song-b-mood5.mp3', cover: 'cover-b-mood5.jpg' },
  ],
  mood6: [
    { title: 'Song A (Mood 6)', audio: 'song-a-mood6.mp3', cover: 'cover-a-mood6.jpg' },
    { title: 'Song B (Mood 6)', audio: 'song-b-mood6.mp3', cover: 'cover-b-mood6.jpg' },
  ],
};

function initPlayer() {
  const mood = sessionStorage.getItem('guest_mood');
  const moodTitleEl = document.getElementById('moodTitle');
  const trackTitleEl = document.getElementById('trackTitle');
  const coverArtEl = document.getElementById('coverArt');
  const audioSrc = document.getElementById('audioSrc');
  const audio = document.getElementById('audio');
  const newPick = document.getElementById('newPick');

  if (!mood || !moodLibrary[mood]) {
    // If user hit the page directly or mood unknown, go back to home
    window.location.replace('index.html');
    return;
  }

  // Title line (you can map mood → friendly text later)
  if (moodTitleEl) moodTitleEl.textContent = `You’re feeling: ${mood}`;

  // Randomly choose one of the two options
  const picks = moodLibrary[mood];
  const choice = picks[Math.floor(Math.random() * picks.length)];

  // Populate UI
  if (trackTitleEl) trackTitleEl.textContent = choice.title;
  if (coverArtEl) {
    coverArtEl.src = choice.cover || '';
    coverArtEl.alt = `${choice.title} cover art`;
  }
  if (audioSrc && audio) {
    audioSrc.src = choice.audio;      // set your MP3/URL here
    audio.load();
  }

  if (newPick) newPick.addEventListener('click', () => {
    sessionStorage.removeItem('guest_mood');
    window.location.href = 'index.html';
  });
}

// Only runs on player.html
if (document.body.classList.contains('bg-gradient') && document.querySelector('.player-card')) {
  initPlayer();
}
