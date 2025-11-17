// ---------------- Mood Selection Logic ----------------
const chips = document.querySelectorAll('.chip');
const generateBtn = document.getElementById('generateBtn');
let selectedMood = null;

const userRole = sessionStorage.getItem('userRole'); // Get user role from session storage
const userAge = parseInt(sessionStorage.getItem('userAge'), 10); // Get user age from session storage

chips.forEach(btn => {
  const mood = btn.dataset.mood; // Get the mood from the data-mood attribute

  // Determine if the current user should be restricted based on the new logic
  // Restriction applies if:
  // 1. userRole is 'child' (explicitly added by a parent and under 18)
  // 2. userRole is 'parent' AND userAge is less than 18 (unconnected child, treated as parent for restriction)
  const isRestrictedUser = (userRole === 'child') || (userRole === 'parent' && userAge < 18);

  if (isRestrictedUser && (mood === 'Sad' || mood === 'Rage')) {
    btn.classList.add('is-disabled'); // Add a class to visually disable it
    btn.addEventListener('click', (event) => {
      event.preventDefault(); // Prevent the default action
      alert('This mood is restricted for child accounts due to age restrictions.');
    });
  } else {
    btn.addEventListener('click', () => {
      chips.forEach(c => c.classList.remove('is-selected'));
      btn.classList.add('is-selected');
      selectedMood = mood;
      if (generateBtn) generateBtn.disabled = false;
    });
  }
});

if (generateBtn) {
  generateBtn.addEventListener('click', () => {
    if (!selectedMood) return;
    sessionStorage.setItem('guest_mood', selectedMood);
    window.location.href = 'player.html';
  });
}

// ---------------- Audius API Player Logic ----------------
const state = {
  mood: null,
  queue: [],
  cursor: 0
};

function pickRandomIndex(length) {
  return Math.floor(Math.random() * length);
}

async function fetchTracks(mood) {
  try {
    const hostRes = await fetch('https://api.audius.co');
    const hostData = await hostRes.json();
    const host = hostData.data[0];

    // Fetch tracks for the selected mood
    const res = await fetch(`${host}/v1/tracks/search?query=${encodeURIComponent(mood)}&app_name=MoodSync`);
    const json = await res.json();

    return json.data.map(track => ({
      title: track.title,
      artist: track.user.name,
      cover: track.artwork?.['150x150'] || 'images/default_album_icon.jpg',
      // Use official stream endpoint for reliability
      audio: `${host}/v1/tracks/${track.id}/stream?app_name=MoodSync`
    }));
  } catch (error) {
    console.error('Error fetching tracks:', error);
    return [];
  }
}

async function initPlayer() {
  const mood = sessionStorage.getItem('guest_mood');
  if (!mood) return; // Not on player page

  state.mood = mood;
  const moodTitleEl = document.getElementById('moodTitle');
  if (moodTitleEl) moodTitleEl.textContent = `You’re feeling: ${mood}`;

  state.queue = await fetchTracks(mood);
  if (!state.queue.length) {
    alert('No tracks found for this mood.');
    return;
  }

  state.cursor = pickRandomIndex(state.queue.length);
  setTrackInUI(state.queue[state.cursor]);
}

function setTrackInUI(track) {
  const trackTitleEl = document.getElementById('trackTitle');
  const coverArtEl = document.getElementById('coverArt');
  const audioSrc = document.getElementById('audioSrc');
  const audio = document.getElementById('audio');

  if (trackTitleEl) trackTitleEl.textContent = `${track.title} — ${track.artist}`;
  if (coverArtEl) {
    coverArtEl.src = track.cover;
    coverArtEl.alt = `${track.title} cover art`;
  }
  if (audioSrc && audio) {
    audioSrc.src = track.audio;
    audio.load();
    // Autoplay handling
    audio.play().catch(() => {
      console.warn('Autoplay blocked. User must click play.');
    });
  }
}

// Next track
document.getElementById('skipBtn')?.addEventListener('click', () => {
  if (!state.queue.length) return;
  state.cursor = (state.cursor + 1) % state.queue.length;
  setTrackInUI(state.queue[state.cursor]);
});

// Previous track
document.getElementById('prevBtn')?.addEventListener('click', () => {
  if (!state.queue.length) return;
  state.cursor = (state.cursor - 1 + state.queue.length) % state.queue.length;
  setTrackInUI(state.queue[state.cursor]);
});

// ---------------- Play/Pause Button ----------------
const playPauseBtn = document.getElementById('playPauseBtn');
if (playPauseBtn) {
  playPauseBtn.addEventListener('click', () => {
    const audio = document.getElementById('audio');
    if (!audio) return;

    if (audio.paused) {
      audio.play().catch(() => console.warn('Autoplay blocked.'));
      // Change icon to Pause
      playPauseBtn.innerHTML = `
        <svg width="20" height="20" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <rect x="6" y="4" width="4" height="16" fill="currentColor"/>
          <rect x="14" y="4" width="4" height="16" fill="currentColor"/>
        </svg>
      `;
    } else {
      audio.pause();
      // Change icon back to Play
      playPauseBtn.innerHTML = `
        <svg width="20" height="20" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path d="M5 3v18l15-9L5 3z" fill="currentColor"/>
        </svg>
      `;
    }
  });
}

window.addEventListener('DOMContentLoaded', initPlayer);