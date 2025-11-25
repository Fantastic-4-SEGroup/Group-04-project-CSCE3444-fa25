import { initializeApp } from "https://www.gstatic.com/firebasejs/12.4.0/firebase-app.js";
import { getAuth, sendPasswordResetEmail } from "https://www.gstatic.com/firebasejs/12.4.0/firebase-auth.js";

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

const reset = document.getElementById("reset");
if (reset) {
  reset.addEventListener("click", async function (event) {
    event.preventDefault();

    // Try to read an email from the login form; the field is `loginIdentifier`.
    const emailInput = document.getElementById("loginIdentifier") || document.getElementById("email");
    let email = emailInput && emailInput.value ? emailInput.value.trim() : '';

    if (!email) {
      // Prompt user for email if not present in form
      email = prompt('Enter the email address for your account to receive a password reset link:');
      if (!email) return;
      email = email.trim();
    }

    // Basic validation: require an email-like string
    if (!email.includes('@')) {
      alert('Please provide a valid email address.');
      return;
    }

    try {
      await sendPasswordResetEmail(auth, email);
      alert('Password reset email sent to ' + email);
    } catch (err) {
      console.error('Password reset error:', err);
      alert('Failed to send password reset: ' + (err.message || err));
    }
  });
}