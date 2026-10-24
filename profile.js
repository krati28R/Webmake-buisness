import { auth, db, onAuthStateChanged, doc, getDoc, setDoc, serverTimestamp } from "./firebase.js";

const form = document.getElementById('profile-form');
const statusEl = document.getElementById('profile-status');
let currentUser = null;

// 1. Check karo: user login hai ya nahi
onAuthStateChanged(auth, async (user) => {
  if (!user) { location.href = 'login.html'; return; } // login nahi hai to login page par bhejo
  currentUser = user;

  try {
    // Agar profile pehle se bani hai, to dobara form mat dikhao
    const snap = await getDoc(doc(db, 'users', user.uid));
    if (snap.exists()) { location.href = 'index.html'; return; }
  } catch (err) { /* form dikhne do */ }

  // Login se jo email aur naam mila wo form mein bhar do
  form.elements['email'].value = user.email || '';
  form.elements['name'].value = user.displayName || '';
});

// 2. Form submit hone par data Firebase mein save karo
form.addEventListener('submit', async (e) => {
  e.preventDefault();
  if (!currentUser) return;

  const f = new FormData(form);
  statusEl.textContent = 'Saving...';
  statusEl.className = '';

  try {
    await setDoc(doc(db, 'users', currentUser.uid), {
      name: f.get('name'),
      phone: f.get('phone'),
      email: currentUser.email,
      age: Number(f.get('age')),
      gender: f.get('gender'),
      status: f.get('status'),
      createdAt: serverTimestamp()
    });
    location.href = 'index.html'; // save ho gaya, ab main page par jao
  } catch (err) {
    statusEl.textContent = 'Could not save. Please try again.';
    statusEl.className = 'error';
  }
});