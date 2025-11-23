import { initializeApp, getApps } from "https://www.gstatic.com/firebasejs/12.4.0/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.4.0/firebase-auth.js";
import {
  getFirestore, doc, getDoc, updateDoc, setDoc, serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.4.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyDPMnsowBumLJVqV0JYred8mlgdy7gqOaA",
  authDomain: "mood-sync-d-98f90.firebaseapp.com",
  projectId: "mood-sync-d-98f90",
  storageBucket: "mood-sync-d-98f90.firebasestorage.app",
  messagingSenderId: "116363977039",
  appId: "1:116363977039:web:b5fd844a9ecca38983253a"
};

if (!getApps().length) initializeApp(firebaseConfig);
const auth = getAuth();
const db = getFirestore();

// Map mood names (as stored) to CSS classes used in calendar color key
const MOOD_CLASS = {
  Energizing: 'energizing',
  Sentimental: 'sentimental',
  Upbeat: 'upbeat',
  Empowering: 'empowering',
  Yearning: 'yearning',
  Peaceful: 'peaceful'
};

/**
 * Record today's mood for the current user (or provided uid).
 * Saves in users/{uid}.dailyMoods map with key YYYY-MM-DD -> mood string.
 */
export async function recordDailyMood(mood, uidOverride = null) {
  const uid = uidOverride || (auth.currentUser && auth.currentUser.uid);
  if (!uid) throw new Error('Not authenticated');

  const today = new Date().toISOString().slice(0, 10);
  const userRef = doc(db, 'users', uid);

  try {
    await updateDoc(userRef, {
      [`dailyMoods.${today}`]: mood,
      lastMoodSet: serverTimestamp()
    });
  } catch (err) {
    // If doc doesn't exist, create/merge
    await setDoc(userRef, {
      dailyMoods: { [today]: mood },
      lastMoodSet: serverTimestamp()
    }, { merge: true });
  }
}

/** Return the dailyMoods map for a user (date string -> mood). */
export async function getDailyMoods(uid) {
  if (!uid) return {};
  const snap = await getDoc(doc(db, 'users', uid));
  if (!snap.exists()) return {};
  return snap.data().dailyMoods || {};
}

/* ---------- Calendar UI rendering ---------- */

const calendarGrid = document.getElementById('calendarGrid');
const currentMonthYear = document.getElementById('currentMonthYear');
const prevBtn = document.getElementById('prevMonthBtn');
const nextBtn = document.getElementById('nextMonthBtn');

let activeUid = null;
let activeMoods = {};
let viewDate = new Date(); // controls which month is shown

function buildDayCell(year, month, day, moodsMap) {
  const dateKey = new Date(year, month, day).toISOString().slice(0, 10);
  const wrapper = document.createElement('div');
  wrapper.className = 'calendar-day';
  wrapper.innerHTML = `<div class="calendar-day-num">${day}</div>`;

  const mood = moodsMap[dateKey];
  if (mood) {
    const moodClass = MOOD_CLASS[mood] || mood.toLowerCase().replace(/\s+/g, '-');
    wrapper.classList.add('has-mood', moodClass);
    // Do not render the mood word text in the cell — rely on the CSS
    // class to show the color. Keep the mood available as a tooltip and
    // accessible label for screen readers.
    wrapper.setAttribute('title', mood);
    wrapper.setAttribute('aria-label', `Mood: ${mood}`);
  }

  return wrapper;
}

function renderCalendarForMonth(year, month, moodsMap) {
  if (!calendarGrid) return;
  calendarGrid.innerHTML = ''; // clear

  // Insert weekday header row (Sun..Sat). These are part of the same
  // grid so they will occupy the first row above the date cells.
  const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  for (const wd of weekdays) {
    const hd = document.createElement('div');
    hd.className = 'calendar-weekday';
    hd.textContent = wd;
    calendarGrid.appendChild(hd);
  }

  const first = new Date(year, month, 1);
  const last = new Date(year, month + 1, 0);
  const startWeekday = first.getDay(); // 0 = Sun
  const daysInMonth = last.getDate();

  // Add empty placeholders for leading days
  for (let i = 0; i < startWeekday; i++) {
    const empty = document.createElement('div');
    empty.className = 'calendar-day empty';
    calendarGrid.appendChild(empty);
  }

  for (let d = 1; d <= daysInMonth; d++) {
    const cell = buildDayCell(year, month, d, moodsMap);
    calendarGrid.appendChild(cell);
  }

  // Update header
  const opts = { year: 'numeric', month: 'long' };
  currentMonthYear.textContent = new Date(year, month, 1).toLocaleDateString(undefined, opts);
}

async function loadAndRender(uid, year, month) {
  activeMoods = await getDailyMoods(uid);
  renderCalendarForMonth(year, month, activeMoods);
}

function initCalendarNavigation(uid) {
  prevBtn?.addEventListener('click', async () => {
    viewDate = new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1);
    await loadAndRender(uid, viewDate.getFullYear(), viewDate.getMonth());
  });
  nextBtn?.addEventListener('click', async () => {
    viewDate = new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1);
    await loadAndRender(uid, viewDate.getFullYear(), viewDate.getMonth());
  });
}

/* Wire up auth and initial render when calendar.html is opened */
onAuthStateChanged(auth, async (user) => {
  if (!user) {
    // Optionally show a guest message
    currentMonthYear && (currentMonthYear.textContent = 'Please sign in to view calendar');
    return;
  }
  activeUid = user.uid;
  initCalendarNavigation(activeUid);
  viewDate = new Date();
  await loadAndRender(activeUid, viewDate.getFullYear(), viewDate.getMonth());
});

/* Optional: expose small helper on window for quick testing in console */
window.MoodCalendar = {
  recordDailyMood,
  getDailyMoods
};