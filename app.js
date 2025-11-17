import { initializeApp } from "https://www.gstatic.com/firebasejs/12.4.0/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.4.0/firebase-auth.js";
import { getFirestore, doc, getDoc, setDoc, updateDoc } from "https://www.gstatic.com/firebasejs/12.4.0/firebase-firestore.js";
import { saveMoodForDate } from './calendar.js'; // Import the function from calendar.js

// Firebase config (same as other files)
const firebaseConfig = {
  apiKey: "AIzaSyDPMnsowBumLJVqV0JYred8mlgdy7gqOaA",
  authDomain: "mood-sync-d-98f90.firebaseapp.com",
  projectId: "mood-sync-d-98f90",
  storageBucket: "mood-sync-d-98f90.firebasestorage.app",
  messagingSenderId: "116363977039",
  appId: "1:116363977039:web:b5fd844a9ecca38983253a"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app); // db is not directly used here, but it's part of the standard Firebase setup.

let currentLoggedInUser = null;
let isChildUser = false; // Default to false

onAuthStateChanged(auth, async (user) => {
  if (user) {
    currentLoggedInUser = user;
    // In a real app, you'd fetch the user's role from Firestore or a custom claim
    // For now, we'll simulate it.
    // Example: const userDoc = await getDoc(doc(db, "users", user.uid));
    // if (userDoc.exists() && userDoc.data().role === 'child') {
    //   isChildUser = true;
    // }
    // For demonstration, let's assume a child user if their email contains 'child'
    if (user.email && user.email.includes('child')) {
        isChildUser = true;
    }
  } else {
    currentLoggedInUser = null;
    isChildUser = false;
  }
});

// ---------------- Mood Selection Logic ----------------
// Function to record mood for the calendar
async function recordMoodForCalendar(mood) {
  if (!currentLoggedInUser) {
    console.warn("User not logged in. Mood not recorded for calendar.");
    return;
  }
  const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
  await saveMoodForDate(currentLoggedInUser.uid, today, mood);
  console.log(`Mood '${mood}' recorded for ${today} by user ${currentLoggedInUser.uid}`);
}

const chips = document.querySelectorAll('.chip');
const generateBtn = document.getElementById('generateBtn');
let selectedMood = null;

chips.forEach(btn => {
  btn.addEventListener('click', async () => { // Make the event listener async
    chips.forEach(c => c.classList.remove('is-selected'));
    btn.classList.add('is-selected');
    selectedMood = btn.dataset.mood;

    // Record the selected mood for the calendar
    await recordMoodForCalendar(selectedMood); // Await the async function

    if (generateBtn) {
      if (isChildUser && (selectedMood === 'rage' || selectedMood === 'sad')) {
        generateBtn.disabled = true;
        alert("Child users cannot generate content for 'rage' or 'sad' moods.");
      } else {
        generateBtn.disabled = false;
      }
    }
  });
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