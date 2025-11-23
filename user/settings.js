import { initializeApp } from "https://www.gstatic.com/firebasejs/12.4.0/firebase-app.js";
import { getAuth, onAuthStateChanged, deleteUser, updateProfile } from "https://www.gstatic.com/firebasejs/12.4.0/firebase-auth.js";
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
        editInfoBtn.addEventListener('click', async () => {
            // Load current user profile from Firestore and present an inline edit form
            const user = auth.currentUser;
            if (!user) return alert('Not signed in');

            const userRef = doc(db, 'users', user.uid);
            const snap = await getDoc(userRef);
            const data = snap.exists() ? snap.data() : {};

            // Build edit form
            const container = document.createElement('div');
            container.className = 'edit-info-form';
            container.innerHTML = `
                <label>Username<br><input id="edit-username" type="text" value="${(data.username||user.displayName||'')}"></label>
                <label>First name<br><input id="edit-firstName" type="text" value="${data.firstName||''}"></label>
                <label>Last name<br><input id="edit-lastName" type="text" value="${data.lastName||''}"></label>
                <div style="margin-top:8px;"><button id="save-info-btn" class="cta">Save</button>
                <button id="cancel-info-btn">Cancel</button></div>
            `;

            const userInfoDiv = document.querySelector('.user-info');
            // hide existing display and append form
            userInfoDiv.style.display = 'none';
            userInfoDiv.parentNode.insertBefore(container, userInfoDiv.nextSibling);

            const saveBtn = container.querySelector('#save-info-btn');
            const cancelBtn = container.querySelector('#cancel-info-btn');

            cancelBtn.addEventListener('click', () => {
                container.remove();
                userInfoDiv.style.display = '';
            });

            saveBtn.addEventListener('click', async () => {
                const newUsername = container.querySelector('#edit-username').value.trim();
                const newFirst = container.querySelector('#edit-firstName').value.trim();
                const newLast = container.querySelector('#edit-lastName').value.trim();
                const newBirth = container.querySelector('#edit-birthdate').value || null;

                try {
                    // Update Firestore user doc
                    await updateDoc(userRef, {
                        username: newUsername || null,
                        firstName: newFirst || null,
                        lastName: newLast || null,
                        birthdate: newBirth
                    });

                    // Update auth displayName if changed
                    try {
                        if (newUsername && user.displayName !== newUsername) {
                            await updateProfile(user, { displayName: newUsername });
                        }
                    } catch (e) {
                        console.warn('Failed to update auth profile displayName:', e);
                    }

                    // Refresh UI
                    const usernameSpan = document.getElementById('username');
                    const emailSpan = document.getElementById('email');
                    if (usernameSpan) usernameSpan.textContent = newUsername || user.displayName || '';
                    if (emailSpan) emailSpan.textContent = user.email || '';

                    container.remove();
                    userInfoDiv.style.display = '';
                    alert('Profile updated.');
                } catch (err) {
                    console.error('Failed to save profile:', err);
                    alert('Failed to save profile. See console for details.');
                }
            });
        });
    }

    if (deleteAccountBtn) {
        deleteAccountBtn.addEventListener('click', async () => {
            if (confirm('Are you sure you want to delete your account? This action cannot be undone.')) {
                const user = auth.currentUser;
                if (user) {
                    try {
                        const userDocRef = doc(db, "users", user.uid);
                        const userDoc = await getDoc(userDocRef);
                        if (userDoc.exists() && userDoc.data().role === 'parent') {
                            const parentControlsRef = doc(db, "parentalControls", user.uid);
                            const parentControlsDoc = await getDoc(parentControlsRef);
                            if (parentControlsDoc.exists()) {
                                const children = parentControlsDoc.data().children || [];
                                const batch = writeBatch(db);

                                // Update associated children's roles
                                for (const child of children) {
                                    const childUserRef = doc(db, "users", child.childUid);
                                    batch.update(childUserRef, { role: 'user', parentUid: null });
                                }
                                // Delete the parentalControls document
                                batch.delete(parentControlsRef);
                                await batch.commit();
                            }
                        }

                        await deleteUser(user);
                        alert('Account deleted successfully.');
                        window.location.href = '../index.html';
                    } catch (error) {
                        console.error("Error deleting user:", error);
                        alert('Failed to delete account. Please sign out and sign back in to try again.');
                    }
                }
            }
        });
    }

    async function handleParentControls(user) {
        const userDocRef = doc(db, "users", user.uid);
        const userDoc = await getDoc(userDocRef);
        if (userDoc.exists()) {
            const userData = userDoc.data();
            if (userData.role === 'parent') {
                parentControlsSection.style.display = 'block';
                parentView.style.display = 'block';
                childView.style.display = 'none';
                await checkChildrensAges(user.uid);
                await loadChildrenList(user.uid);
            } else if (userData.role === 'child') {
                parentControlsSection.style.display = 'block';
                parentView.style.display = 'none';
                childView.style.display = 'block';
            }
        }
    }

    async function checkChildrensAges(parentUid) {
        const parentControlsRef = doc(db, "parentalControls", parentUid);
        const parentControlsDoc = await getDoc(parentControlsRef);
        if (parentControlsDoc.exists()) {
            const children = parentControlsDoc.data().children || [];
            const batch = writeBatch(db);
            let changesMade = false;

            for (const child of children) {
                const childUserDoc = await getDoc(doc(db, "users", child.childUid));
                if (childUserDoc.exists()) {
                    const childData = childUserDoc.data();
                    if (childData.birthdate) {
                        const birthDate = new Date(childData.birthdate);
                        let age = new Date().getFullYear() - birthDate.getFullYear();
                        const m = new Date().getMonth() - birthDate.getMonth();
                        if (m < 0 || (m === 0 && new Date().getDate() < birthDate.getDate())) {
                            age--;
                        }
                        if (age >= 18) {
                            changesMade = true;
                            const childUserRef = doc(db, "users", child.childUid);
                            batch.update(childUserRef, { role: 'user', parentUid: null });
                        }
                    }
                }
            }

            if (changesMade) {
                const updatedChildren = children.filter(async (child) => {
                    const childUserDoc = await getDoc(doc(db, "users", child.childUid));
                    if (childUserDoc.exists()) {
                        const childData = childUserDoc.data();
                        if (childData.birthdate) {
                            const birthDate = new Date(childData.birthdate);
                            let age = new Date().getFullYear() - birthDate.getFullYear();
                            const m = new Date().getMonth() - birthDate.getMonth();
                            if (m < 0 || (m === 0 && new Date().getDate() < birthDate.getDate())) {
                                age--;
                            }
                            return age < 18;
                        }
                    }
                    return true;
                });
                batch.update(parentControlsRef, { children: updatedChildren });
                await batch.commit();
            }
        }
    }

    async function loadChildrenList(parentUid) {
        const parentControlsRef = doc(db, "parentalControls", parentUid);
        const parentControlsDoc = await getDoc(parentControlsRef);
        childrenListDiv.innerHTML = '';
        if (parentControlsDoc.exists()) {
            const children = parentControlsDoc.data().children || [];
            for (const child of children) {
                const childUserDoc = await getDoc(doc(db, "users", child.childUid));
                if (childUserDoc.exists()) {
                    const childData = childUserDoc.data();
                    const childDiv = document.createElement('div');
                    childDiv.classList.add('child');
                    childDiv.innerHTML = `
                        <span>${childData.email}</span>
                        <button data-child-uid="${child.childUid}">Remove</button>
                    `;
                    childrenListDiv.appendChild(childDiv);
                }
            }
        }
    }

    if (addChildBtn) {
        addChildBtn.addEventListener('click', async () => {
            const childEmail = childEmailInput.value.trim();
            if (!childEmail) {
                alert('Please enter a child\'s email.');
                return;
            }

            const usersRef = collection(db, "users");
            const q = query(usersRef, where("email", "==", childEmail));
            const querySnapshot = await getDocs(q);

            if (querySnapshot.empty) {
                alert('User with this email does not exist.');
                return;
            }

            const childUserDoc = querySnapshot.docs[0];
            const childUid = childUserDoc.id;

            // Helper to compute age from stored birthdate (returns null if unknown)
            function computeAgeFromBirthdate(birthdate) {
                if (!birthdate) return null;
                const bd = new Date(birthdate);
                if (Number.isNaN(bd.getTime())) return null;
                let age = new Date().getFullYear() - bd.getFullYear();
                const m = new Date().getMonth() - bd.getMonth();
                if (m < 0 || (m === 0 && new Date().getDate() < bd.getDate())) {
                    age--;
                }
                return age;
            }

            // Fetch both parent and target user docs to validate ages
            const parentUid = currentUser.uid;
            const parentUserDocSnap = await getDoc(doc(db, 'users', parentUid));
            const parentData = parentUserDocSnap.exists() ? parentUserDocSnap.data() : {};
            const parentAge = computeAgeFromBirthdate(parentData.birthdate);

            const childData = childUserDoc.data();
            const childAge = computeAgeFromBirthdate(childData.birthdate);

            // Business rule: a user under 18 cannot add someone older than 18
            if (parentAge !== null && parentAge < 18 && childAge !== null && childAge >= 18) {
                alert('You cannot add a person older than 18 if you are under 18.');
                return;
            }

            // If we can't determine the target user's age, be conservative and require verification
            if (parentAge !== null && parentAge < 18 && childAge === null) {
                alert('Cannot verify the age of the user you are trying to add; action blocked.');
                return;
            }

            const parentControlsRef = doc(db, "parentalControls", parentUid);
            const parentControlsDoc = await getDoc(parentControlsRef);

            const batch = writeBatch(db);

            if (parentControlsDoc.exists()) {
                const children = parentControlsDoc.data().children || [];
                if (children.some(c => c.childUid === childUid)) {
                    alert('This child is already in your restricted list.');
                    return;
                }
                batch.update(parentControlsRef, {
                    children: [...children, { childUid: childUid, ageRestrictedMusicEnabled: true }]
                });
            } else {
                batch.set(parentControlsRef, {
                    children: [{ childUid: childUid, ageRestrictedMusicEnabled: true }]
                });
            }

            const childUserRef = doc(db, "users", childUid);
            batch.update(childUserRef, { role: 'child', parentUid: parentUid });

            await batch.commit();
            await loadChildrenList(parentUid);
            childEmailInput.value = '';
        });
    }

    childrenListDiv.addEventListener('click', async (event) => {
        if (event.target.tagName === 'BUTTON') {
            const childUid = event.target.dataset.childUid;
            const parentUid = currentUser.uid;

            const parentControlsRef = doc(db, "parentalControls", parentUid);
            const parentControlsDoc = await getDoc(parentControlsRef);

            if (parentControlsDoc.exists()) {
                const children = parentControlsDoc.data().children || [];
                const updatedChildren = children.filter(c => c.childUid !== childUid);

                const batch = writeBatch(db);
                batch.update(parentControlsRef, { children: updatedChildren });

                const childUserRef = doc(db, "users", childUid);
                batch.update(childUserRef, { role: 'user', parentUid: null });

                await batch.commit();
                await loadChildrenList(parentUid);
            }
        }
    });
});
