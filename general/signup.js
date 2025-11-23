// Import Firebase SDKs
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.4.0/firebase-app.js";
import {
  getAuth,
  createUserWithEmailAndPassword,
  updateProfile
} from "https://www.gstatic.com/firebasejs/12.4.0/firebase-auth.js";
import {
  getFirestore,
  doc,
  setDoc
} from "https://www.gstatic.com/firebasejs/12.4.0/firebase-firestore.js";
import { incrementTodayLoginCount } from "../user/dailyLogins.js";

// Firebase config (same)
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

const submit = document.getElementById("submit");

document.addEventListener('DOMContentLoaded', function () {
  var today = new Date();
  var dd = String(today.getDate()).padStart(2, '0');
  var mm = String(today.getMonth() + 1).padStart(2, '0'); // January is 0!
  var yyyy = today.getFullYear();

  today = yyyy + '-' + mm + '-' + dd;
  const bdInput = document.getElementById('birthdate') || document.getElementById('birthday');
  if (bdInput) bdInput.setAttribute('max', today);
});

submit.addEventListener("click", async function (event) {
  event.preventDefault();

  const firstName = document.getElementById("firstName").value.trim();
  const lastName = document.getElementById("lastName").value.trim();
  const username = document.getElementById("username").value.trim();
  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value;
  const birthdate = document.getElementById("birthdate").value;

  // Validate birthdate is not in the future (defensive check in case browser ignores `max`)
  if (birthdate) {
    const picked = new Date(birthdate);
    const now = new Date();
    // normalize by zeroing time portion for comparison
    picked.setHours(0,0,0,0);
    now.setHours(0,0,0,0);
    if (picked > now) {
      alert('Birthdate cannot be in the future. Please select a valid date.');
      return;
    }
  }

  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    await updateProfile(user, {
      displayName: username || firstName || "User"
    });

    let role = 'user';
    let age = null; // Initialize age
    if (birthdate) {
      const birthDate = new Date(birthdate);
      age = new Date().getFullYear() - birthDate.getFullYear();
      const m = new Date().getMonth() - birthDate.getMonth();
      if (m < 0 || (m === 0 && new Date().getDate() < birthDate.getDate())) {
        age--;
      }
      // As per the new requirement: if under 18 and not connected to a parent, treat as 'parent' for restrictions.
      // If 18 or over, they are also a 'parent'.
      // So, if a birthdate is provided, the role will be 'parent' at creation.
      role = 'parent';
    }

    await setDoc(doc(db, "users", user.uid), {
      uid: user.uid,
      email: user.email,
      username: username,
      firstName: firstName,
      lastName: lastName,
      birthdate: birthdate,
      role: role,
      createdAt: new Date(),
      preferencesSet: false
    });

    // Count this initial account creation as today's first login.
    try {
      await incrementTodayLoginCount(user.uid);
    } catch (incErr) {
      console.warn('Failed to increment daily login at signup:', incErr);
    }

    // Set userRole and userAge in sessionStorage
    sessionStorage.setItem('userRole', role);
    if (age !== null) {
      sessionStorage.setItem('userAge', age.toString());
    }

    // After sign up, require new users to pick their preferred genres one time.
    // The preferences page lives under `user/` so use a parent-relative path.
    window.location.href = "../user/preferences.html";
  } catch (error) {
    alert("Error: " + error.message);
  }
});
