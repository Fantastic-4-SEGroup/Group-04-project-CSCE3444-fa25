import { initializeApp, getApps } from "https://www.gstatic.com/firebasejs/12.4.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/12.4.0/firebase-auth.js";
import { getFirestore, doc, getDoc, updateDoc, setDoc, serverTimestamp, increment } from "https://www.gstatic.com/firebasejs/12.4.0/firebase-firestore.js";

// Firebase config (kept local to this helper to avoid coupling). If your
// project already initializes Firebase elsewhere, this module will detect
// an existing app and avoid calling initializeApp again.
const firebaseConfig = {
  apiKey: "AIzaSyDPMnsowBumLJVqV0JYred8mlgdy7gqOaA",
  authDomain: "mood-sync-d-98f90.firebaseapp.com",
  projectId: "mood-sync-d-98f90",
  storageBucket: "mood-sync-d-98f90.firebasestorage.app",
  messagingSenderId: "116363977039",
  appId: "1:116363977039:web:b5fd844a9ecca38983253a"
};

if (!getApps().length) {
  initializeApp(firebaseConfig);
}

const auth = getAuth();
const db = getFirestore();

export function todayKey() {
  return new Date().toISOString().slice(0, 10); // YYYY-MM-DD
}

/**
 * Get the daily login count for a given user and date key.
 * If `uid` is omitted, current signed-in user is used.
 */
export async function getDailyLoginCount(uid, dateKey = todayKey()) {
  if (!uid) {
    const u = auth.currentUser;
    if (!u) return 0;
    uid = u.uid;
  }

  const userRef = doc(db, 'users', uid);
  const snap = await getDoc(userRef);
  if (!snap.exists()) return 0;
  const data = snap.data();
  return data.dailyLogins?.[dateKey] ?? 0;
}

/**
 * Convenience: get today's login count for the currently authenticated user.
 */
export async function getTodayLoginCountForCurrentUser() {
  return getDailyLoginCount(undefined, todayKey());
}

/**
 * Atomically increment today's login counter for `uid` (or current user if omitted).
 * Returns the updated count after the increment.
 */
export async function incrementTodayLoginCount(uid) {
  if (!uid) {
    const u = auth.currentUser;
    if (!u) throw new Error('No authenticated user available to increment login count');
    uid = u.uid;
  }

  const userRef = doc(db, 'users', uid);
  const key = todayKey();

  try {
    await updateDoc(userRef, {
      [`dailyLogins.${key}`]: increment(1),
      lastLogin: serverTimestamp()
    });
  } catch (err) {
    // If updating fails (missing document), create the map entry with merge
    await setDoc(userRef, {
      dailyLogins: { [key]: 1 },
      lastLogin: serverTimestamp()
    }, { merge: true });
  }

  // Read back the value and return it (best-effort)
  const snap = await getDoc(userRef);
  if (!snap.exists()) return 0;
  const data = snap.data();
  return data.dailyLogins?.[key] ?? 0;
}

export default {
  todayKey,
  getDailyLoginCount,
  getTodayLoginCountForCurrentUser,
  incrementTodayLoginCount
};
