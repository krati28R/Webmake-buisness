import {
  auth, onAuthStateChanged, signInWithPopup, GoogleAuthProvider,
  createUserWithEmailAndPassword, signInWithEmailAndPassword
} from "./firebase.js";

const form = document.getElementById('auth-form');
const statusEl = document.getElementById('auth-status');
const say = (m, t) => { statusEl.textContent = m; statusEl.className = t || ''; };

// Agar user pehle se signed in hai, to main page par bhej do
onAuthStateChanged(auth, (user) => { if (user) location.href = 'index.html'; });

// Firebase ke technical errors ko simple message mein badlo
function friendly(err) {
  const c = (err && err.code) || '';
  if (/invalid-credential|wrong-password|user-not-found/.test(c)) return 'Wrong email or password.';
  if (c.includes('email-already-in-use')) return 'This email already has an account. Use Sign in.';
  if (c.includes('weak-password')) return 'Password must be at least 6 characters.';
  if (c.includes('popup-closed')) return 'Google sign in was closed.';
  if (c.includes('unauthorized-domain')) return 'Add this website address in Firebase, Authentication, Settings, Authorized domains.';
  return 'Something went wrong. Please try again.';
}

const creds = () => [
  document.getElementById('email').value,
  document.getElementById('password').value
];

// Sign in button
form.addEventListener('submit', async (e) => {
  e.preventDefault();
  say('Signing in...');
  try { await signInWithEmailAndPassword(auth, ...creds()); }
  catch (err) { say(friendly(err), 'error'); }
});

// Create account button
document.getElementById('signup-btn').addEventListener('click', async () => {
  if (!form.reportValidity()) return;
  say('Creating account...');
  try { await createUserWithEmailAndPassword(auth, ...creds()); }
  catch (err) { say(friendly(err), 'error'); }
});

// Google button
document.getElementById('google-btn').addEventListener('click', async () => {
  say('Opening Google...');
  try { await signInWithPopup(auth, new GoogleAuthProvider()); }
  catch (err) { say(friendly(err), 'error'); }
});