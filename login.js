import {
  auth, onAuthStateChanged, signInWithPopup, GoogleAuthProvider,
  createUserWithEmailAndPassword, signInWithEmailAndPassword
} from "./firebase.js";

const form = document.getElementById('auth-form');
const statusEl = document.getElementById('auth-status');
const pwInput = document.getElementById('password');
const pwHint = document.getElementById('pw-hint');
const say = (m, t) => { statusEl.textContent = m; statusEl.className = t || ''; };

onAuthStateChanged(auth, (user) => { if (user) location.href = 'home.html'; });

function friendly(err) {
  const c = (err && err.code) || '';
  if (/invalid-credential|wrong-password|user-not-found/.test(c)) return 'Wrong email or password.';
  if (c.includes('email-already-in-use')) return 'This email already has an account. Use Sign in.';
  if (c.includes('weak-password')) return 'Password must be at least 6 characters.';
  if (c.includes('popup-closed')) return 'Google sign in was closed.';
  if (c.includes('unauthorized-domain')) return 'Add this website address in Firebase, Authentication, Settings, Authorized domains.';
  return 'Something went wrong. Please try again.';
}

const creds = () => [document.getElementById('email').value, pwInput.value];

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  say('Signing in...');
  try { await signInWithEmailAndPassword(auth, ...creds()); }
  catch (err) { say(friendly(err), 'error'); }
});

document.getElementById('signup-btn').addEventListener('click', async () => {
  if (!form.reportValidity()) return;
  say('Creating account...');
  try { await createUserWithEmailAndPassword(auth, ...creds()); }
  catch (err) { say(friendly(err), 'error'); }
});

document.getElementById('google-btn').addEventListener('click', async () => {
  say('Opening Google...');
  try { await signInWithPopup(auth, new GoogleAuthProvider()); }
  catch (err) { say(friendly(err), 'error'); }
});

// Show / hide password
const toggle = document.getElementById('pw-toggle');
toggle.addEventListener('click', () => {
  const hidden = pwInput.type === 'password';
  pwInput.type = hidden ? 'text' : 'password';
  toggle.textContent = hidden ? 'Hide' : 'Show';
});

// Strong password suggestion (different every click)
function randomIndex(n) {
  const a = new Uint32Array(1);
  const limit = Math.floor(4294967296 / n) * n;
  do { crypto.getRandomValues(a); } while (a[0] >= limit);
  return a[0] % n;
}

function strongPassword(len = 14) {
  const sets = ['ABCDEFGHJKLMNPQRSTUVWXYZ', 'abcdefghijkmnopqrstuvwxyz', '23456789', '!@#$%&*?'];
  const all = sets.join('');
  const chars = sets.map(s => s[randomIndex(s.length)]);
  while (chars.length < len) chars.push(all[randomIndex(all.length)]);
  for (let i = chars.length - 1; i > 0; i--) {
    const j = randomIndex(i + 1);
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }
  return chars.join('');
}

document.getElementById('suggest-btn').addEventListener('click', async () => {
  const pw = strongPassword();
  pwInput.value = pw;
  pwInput.type = 'text';
  toggle.textContent = 'Hide';
  let copied = false;
  try { await navigator.clipboard.writeText(pw); copied = true; } catch (e) { /* copy not allowed */ }
  pwHint.textContent = (copied ? 'Copied. ' : '') + 'Save this password somewhere safe, then press Create account. Click again for a different one.';
});