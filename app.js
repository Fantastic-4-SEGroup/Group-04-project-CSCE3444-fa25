import { initializeApp } from "https://www.gstatic.com/firebasejs/12.4.0/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.4.0/firebase-auth.js";
import { getFirestore, doc, getDoc } from "https://www.gstatic.com/firebasejs/12.4.0/firebase-firestore.js";

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
const db = getFirestore(app);

// ---------------- Mood Selection Logic ----------------
const chips = document.querySelectorAll('.chip');
const generateBtn = document.getElementById('generateBtn');
let selectedMood = null;

chips.forEach(btn => {
  btn.addEventListener('click', () => {
    chips.forEach(c => c.classList.remove('is-selected'));
    btn.classList.add('is-selected');
    selectedMood = btn.dataset.mood;
    if (generateBtn) generateBtn.disabled = false;
  });
});

if (generateBtn) {
  generateBtn.addEventListener('click', () => {
    if (!selectedMood) return;
    sessionStorage.setItem('guest_mood', selectedMood);
    window.location.href = 'player.html';
  });
}

// ---------------- Player Logic ----------------
const state = {
  mood: null,
  queue: [],
  cursor: 0,
  user: null,
  parentalControls: null
};

function pickRandomIndex(length) {
  return Math.floor(Math.random() * length);
}

const localTracks = [
    {
        title: "Viva La Vida",
        artist: "Coldplay",
        cover: "images/coldplay.jpeg",
        audio: "audio/Coldplay - Viva La Vida (Official Video).mp3",
        mood: "Happy",
        inappropriate: false
    },
    {
        title: "Happy",
        artist: "Pharrell Williams",
        cover: "images/Happy_Button_Hue.jpg",
        audio: "audio/Pharrell Williams - Happy (Video).mp3",
        mood: "Happy",
        inappropriate: false
    },
    {
        title: "Rock Your Body",
        artist: "Justin Timberlake",
        cover: "images/Justin_Timberlake_-_Rock_Your_Body.youtube",
        audio: "audio/JustinTimberlake-RockYourBody(Official Video).mp3",
        mood: "Workout",
        inappropriate: false
    },
    {
        title: "Somewhere over the Rainbow",
        artist: "Israel IZ Kamakawiwoʻole",
        cover: "images/somewhere.jpeg",
        audio: "audio/OFFICIAL Somewhere over the Rainbow - Israel IZ Kamakawiwoʻole.mp3",
        mood: "Calm",
        inappropriate: false
    },
    {
        title: "Grinding",
        artist: "Shalon",
        cover: "images/grinding_by_shalon.jpeg",
        audio: "audio/Shalon - Grinding (Official Video) feat. Chuck Diamond.mp3",
        mood: "Rage",
        inappropriate: true
    },
    {
        title: "São Paulo",
        artist: "The Weeknd",
        cover: "images/sao.jpg",
        audio: "audio/The Weeknd - São Paulo feat. Anitta (Official Audio).mp3",
        mood: "Rage",
        inappropriate: true
    }
];

async function fetchTracks(mood) {
    return localTracks.filter(track => track.mood === mood);
}

async function initPlayer() {
    onAuthStateChanged(auth, async (user) => {
        if (user) {
            state.user = user;
            const userDocRef = doc(db, "users", user.uid);
            const userDoc = await getDoc(userDocRef);
            if (userDoc.exists() && userDoc.data().role === 'child' && userDoc.data().parentUid) {
                const parentControlsRef = doc(db, "parentalControls", userDoc.data().parentUid);
                const parentControlsDoc = await getDoc(parentControlsRef);
                if (parentControlsDoc.exists()) {
                    const childControl = parentControlsDoc.data().children.find(c => c.childUid === user.uid);
                    state.parentalControls = childControl;
                }
            }
        }
        
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
        playTrack(state.queue[state.cursor]);
    });
}

function playTrack(track) {
    if (state.parentalControls && state.parentalControls.ageRestrictedMusicEnabled && track.inappropriate) {
        skipTrack();
        return;
    }
    setTrackInUI(track);
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
    audio.play().catch(() => {
      console.warn('Autoplay blocked. User must click play.');
    });
  }
}

function skipTrack() {
    if (!state.queue.length) return;
    state.cursor = (state.cursor + 1) % state.queue.length;
    playTrack(state.queue[state.cursor]);
}

function prevTrack() {
    if (!state.queue.length) return;
    state.cursor = (state.cursor - 1 + state.queue.length) % state.queue.length;
    playTrack(state.queue[state.cursor]);
}

// Next track
document.getElementById('skipBtn')?.addEventListener('click', skipTrack);

// Previous track
document.getElementById('prevBtn')?.addEventListener('click', prevTrack);

// ---------------- Play/Pause Button ----------------
const playPauseBtn = document.getElementById('playPauseBtn');
if (playPauseBtn) {
  playPauseBtn.addEventListener('click', () => {
    const audio = document.getElementById('audio');
    if (!audio) return;

    if (audio.paused) {
      audio.play().catch(() => console.warn('Autoplay blocked.'));
      playPauseBtn.innerHTML = `
        <svg width="20" height="20" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <rect x="6" y="4" width="4" height="16" fill="currentColor"/>
          <rect x="14" y="4" width="4" height="16" fill="currentColor"/>
        </svg>
      `;
    } else {
      audio.pause();
      playPauseBtn.innerHTML = `
        <svg width="20" height="20" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path d="M5 3v18l15-9L5 3z" fill="currentColor"/>
        </svg>
      `;
    }
  });
}

window.addEventListener('DOMContentLoaded', initPlayer);