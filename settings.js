import { initializeApp } from "https://www.gstatic.com/firebasejs/12.4.0/firebase-app.js";
import { getAuth, onAuthStateChanged, deleteUser } from "https://www.gstatic.com/firebasejs/12.4.0/firebase-auth.js";
import { getFirestore, doc, getDoc, setDoc, updateDoc, collection, query, where, getDocs, writeBatch } from "https://www.gstatic.com/firebasejs/12.4.0/firebase-firestore.js";

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

document.addEventListener('DOMContentLoaded', () => {
    const usernameSpan = document.getElementById('username');
    const emailSpan = document.getElementById('email');
    const editInfoBtn = document.getElementById('edit-info-btn');
    const deleteAccountBtn = document.getElementById('delete-account-btn');
    const parentControlsSection = document.getElementById('parent-controls');
    const parentView = document.getElementById('parent-view');
    const childView = document.getElementById('child-view');
    const addChildBtn = document.getElementById('add-child-btn');
    const childEmailInput = document.getElementById('child-email');
    const childrenListDiv = document.getElementById('children-list');

    let currentUser = null;

    onAuthStateChanged(auth, async (user) => {
        if (user) {
            currentUser = user;
            if (usernameSpan) {
                usernameSpan.textContent = user.displayName || 'N/A';
            }
            if (emailSpan) {
                emailSpan.textContent = user.email;
            }
            await handleParentControls(user);
        } else {
            window.location.href = 'login.html';
        }
    });

    if (editInfoBtn) {
        editInfoBtn.addEventListener('click', () => {
            alert('Edit functionality not yet implemented.');
        });
    }

    if (deleteAccountBtn) {
        deleteAccountBtn.addEventListener('click', async () => {
            if (confirm('Are you sure you want to delete your account? This action cannot be undone.')) {
                const user = auth.currentUser;
                if (user) {
                    try {
                        // In a real app, you'd also want to clean up user data from Firestore and other services.
                        await deleteUser(user);
                        alert('Account deleted successfully.');
                        window.location.href = 'index.html';
                    } catch (error) {
                        console.error("Error deleting user:", error);
                        alert('Failed to delete account. Please sign out and sign back in to try again.');
                    }
                }
            }
        });
    }

});
