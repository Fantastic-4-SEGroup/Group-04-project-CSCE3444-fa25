import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/12.4.0/firebase-auth.js";

const auth = getAuth();
const signOutBtn = document.getElementById("signOutBtn");

onAuthStateChanged(auth, (user) => {
  if (signOutBtn) {
    signOutBtn.style.display = user ? "inline-block" : "none";
  }
});

signOutBtn?.addEventListener("click", async () => {
  try {
    signOutBtn.textContent = "Signing out...";
    signOutBtn.disabled = true;

    await signOut(auth);
    sessionStorage.clear();
    localStorage.clear();

    setTimeout(() => {
      window.location.href = "login.html";
    }, 1000);
  } catch (error) {
    alert("Error signing out: " + error.message);
    signOutBtn.textContent = "Sign Out";
    signOutBtn.disabled = false;
  }
});