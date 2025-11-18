import { initializeApp } from "https://www.gstatic.com/firebasejs/12.4.0/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.4.0/firebase-auth.js";
import { getFirestore, doc, getDoc, setDoc, updateDoc } from "https://www.gstatic.com/firebasejs/12.4.0/firebase-firestore.js";

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
const db = getFirestore(app);

let currentUser = null;
let currentMonth = new Date().getMonth();
let currentYear = new Date().getFullYear();
let userMoods = {}; // Cache for user's moods

const moodColorMap = {
  "Energizing": "energizing",
  "Sentimental": "sentimental",
  "Empowering": "empowering",
  "Yearning": "yearning",
  "Peaceful": "peaceful",
  "Upbeat": "upbeat"
};

const calendarGrid = document.getElementById('calendarGrid');
const currentMonthYearHeader = document.getElementById('currentMonthYear');
const prevMonthBtn = document.getElementById('prevMonthBtn');
const nextMonthBtn = document.getElementById('nextMonthBtn');
const welcomeLink = document.getElementById('welcomeLink');

document.addEventListener('DOMContentLoaded', () => {
  onAuthStateChanged(auth, async (user) => {
    if (user) {
      currentUser = user;
      const name = user.displayName || user.email;
      if (welcomeLink) welcomeLink.textContent = `Welcome, ${name}`;
      await fetchUserMoods();
      renderCalendar();
    } else {
      window.location.href = 'login.html'; // Redirect to login if not authenticated
    }
  });

  prevMonthBtn.addEventListener('click', () => {
    currentMonth--;
    if (currentMonth < 0) {
      currentMonth = 11;
      currentYear--;
    }
    renderCalendar();
  });

  nextMonthBtn.addEventListener('click', () => {
    currentMonth++;
    if (currentMonth > 11) {
      currentMonth = 0;
      currentYear++;
    }
    renderCalendar();
  });
});

async function fetchUserMoods() {
  if (!currentUser) return;
  const moodDocRef = doc(db, "moodCalendar", currentUser.uid);
  const moodDoc = await getDoc(moodDocRef);
  if (moodDoc.exists()) {
    userMoods = moodDoc.data();
  } else {
    userMoods = {};
  }
}

function renderCalendar() {
  calendarGrid.innerHTML = ''; // Clear previous calendar
  currentMonthYearHeader.textContent = new Date(currentYear, currentMonth).toLocaleString('default', { month: 'long', year: 'numeric' });

  const firstDayOfMonth = new Date(currentYear, currentMonth, 1).getDay();
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();

  // Add empty cells for days before the 1st
  for (let i = 0; i < firstDayOfMonth; i++) {
    const emptyCell = document.createElement('div');
    emptyCell.classList.add('calendar-day', 'empty');
    calendarGrid.appendChild(emptyCell);
  }

  // Add day cells
  for (let day = 1; day <= daysInMonth; day++) {
    const dayCell = document.createElement('div');
    dayCell.classList.add('calendar-day');
    dayCell.textContent = day;

    const dateKey = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const mood = userMoods[dateKey];

    if (mood && moodColorMap[mood]) {
      dayCell.classList.add(moodColorMap[mood]);
    }

    calendarGrid.appendChild(dayCell);
  }
}

// Function to save mood for a specific date (will be called from app.js)
export async function saveMoodForDate(uid, date, mood) {
  const moodDocRef = doc(db, "moodCalendar", uid);
  await updateDoc(moodDocRef, {
    [date]: mood
  }, { merge: true }); // Use merge to update specific fields without overwriting the whole document
}
