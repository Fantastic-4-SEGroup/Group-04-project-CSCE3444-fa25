import { initializeApp } from "https://www.gstatic.com/firebasejs/12.4.0/firebase-app.js";
import { getAuth, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.4.0/firebase-auth.js";

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

// Redirect if not signed in
onAuthStateChanged(auth, (user) => {
    if (!user) {
        window.location.href = "login.html";
    }
});

document.getElementById("signoutBtn").addEventListener("click", async () => {
    try {
        await signOut(auth);
        alert("Signed out successfully!");
        window.location.href = "login.html";
    } catch (error) {
        alert("Sign out failed: " + error.message);
    }
});
