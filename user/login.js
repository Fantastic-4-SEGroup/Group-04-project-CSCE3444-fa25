import { initializeApp } from "https://www.gstatic.com/firebasejs/12.4.0/firebase-app.js";
import { incrementTodayLoginCount } from "./dailyLogins.js";
import { getAuth, signInWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/12.4.0/firebase-auth.js";
import { getFirestore, collection, query, where, getDocs } from "https://www.gstatic.com/firebasejs/12.4.0/firebase-firestore.js";

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

document.getElementById("loginBtn").addEventListener("click", async (event) => {
  event.preventDefault();
  let identifier = document.getElementById("loginIdentifier").value.trim();
  const password = document.getElementById("loginPassword").value;

  try {
    // If identifier is not an email, look up email by username
    if (!identifier.includes("@")) {
      const q = query(collection(db, "users"), where("username", "==", identifier));
      const querySnapshot = await getDocs(q);
      if (!querySnapshot.empty) {
        identifier = querySnapshot.docs[0].data().email;
      } else {
        throw new Error("Username not found");
      }
    }

    const cred = await signInWithEmailAndPassword(auth, identifier, password);

    // After successful sign-in, use the shared helper to atomically increment
    // today's login counter and update `lastLogin`. The helper handles
    // creating the doc if missing and returns the updated count.
    try {
      const uid = cred.user?.uid;
      if (uid) {
        await incrementTodayLoginCount(uid);
      } else {
        // fallback: try incrementing for current auth user
        await incrementTodayLoginCount();
      }
    } catch (incErr) {
      console.warn('Failed to increment daily login via helper:', incErr);
    }

    window.location.href = "created-user-home.html";
  } catch (error) {
    alert("Login failed: " + error.message);
  }
});