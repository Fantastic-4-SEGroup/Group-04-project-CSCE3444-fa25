import { initializeApp } from "https://www.gstatic.com/firebasejs/12.4.0/firebase-app.js";
import { getAuth, signInWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/12.4.0/firebase-auth.js";
import { getFirestore, collection, query, where, doc, getDocs, updateDoc, setDoc, serverTimestamp, increment } from "https://www.gstatic.com/firebasejs/12.4.0/firebase-firestore.js";

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

    // After successful sign-in, increment the user's daily login counter in Firestore.
    // We store counts in a map field `dailyLogins` keyed by YYYY-MM-DD.
    try {
      const uid = cred.user.uid;
      const userRef = doc(db, "users", uid);
      const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD

      // Try to atomically increment today's counter and update lastLogin timestamp.
      await updateDoc(userRef, {
        [`dailyLogins.${today}`]: increment(1),
        lastLogin: serverTimestamp()
      });
    } catch (updateErr) {
      // If updateDoc fails (e.g. user doc missing), create/merge an initial value.
      try {
        const uid = (cred && cred.user && cred.user.uid) || (auth.currentUser && auth.currentUser.uid);
        if (uid) {
          const userRef = doc(db, "users", uid);
          const today = new Date().toISOString().slice(0, 10);
          await setDoc(userRef, {
            dailyLogins: { [today]: 1 },
            lastLogin: serverTimestamp()
          }, { merge: true });
        }
      } catch (e) {
        console.warn('Failed to record daily login:', e);
      }
    }

    window.location.href = "created-user-home.html";
  } catch (error) {
    alert("Login failed: " + error.message);
  }
});