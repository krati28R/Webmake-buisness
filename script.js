import {
  auth, db, onAuthStateChanged, signOut,
  doc, getDoc, addDoc, collection, serverTimestamp
} from "./firebase.js";

// ---------- 1. Mobile menu ----------
const menuBtn = document.querySelector('.menu-btn');
const links = document.getElementById('links');

if (menuBtn && links) {
  menuBtn.addEventListener('click', () => {
    const open = links.classList.toggle('open');
    menuBtn.setAttribute('aria-expanded', open);
  });
  links.querySelectorAll('a').forEach(a => a.addEventListener('click', () => {
    links.classList.remove('open');
    menuBtn.setAttribute('aria-expanded', 'false');
  }));
}

// ---------- 2. Scroll reveal ----------
const revealEls = document.querySelectorAll('.reveal');
if ('IntersectionObserver' in window) {
  const io = new IntersectionObserver((entries) => {
    entries.forEach(en => {
      if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); }
    });
  }, { threshold: 0.1 });
  revealEls.forEach((el, i) => { el.style.transitionDelay = (i % 3) * 0.1 + 's'; io.observe(el); });
} else {
  revealEls.forEach(el => el.classList.add('in'));
}

// ---------- 3. Login check ----------
// Sirf login kiya hua user, jiski profile bani ho, ye page dekh sakta hai
const form = document.getElementById('contact-form');
const statusEl = document.getElementById('form-status');
const successEl = document.getElementById('success');
let currentUser = null;

onAuthStateChanged(auth, async (user) => {
  if (!user) { location.href = 'login.html'; return; }   // login nahi hai
  currentUser = user;

  try {
    const snap = await getDoc(doc(db, 'users', user.uid));
    if (!snap.exists()) { location.href = 'profile.html'; return; } // profile nahi bani
    const p = snap.data();

    // Navbar mein "Hi, Krati" dikhao
    document.getElementById('hello').textContent = 'Hi, ' + (p.name || '').split(' ')[0];

    // Form mein profile ki details pehle se bhar do
    form.elements['name'].value = p.name || '';
    form.elements['phone'].value = p.phone || '';
    form.elements['email'].value = p.email || user.email || '';
  } catch (err) { /* page phir bhi dikhao */ }

  document.body.classList.remove('pending'); // ab page dikhao
});

// Sign out button
document.getElementById('signout-btn').addEventListener('click', async () => {
  await signOut(auth);
  location.href = 'login.html';
});

// ---------- 4. Business form: Firebase mein save + email ----------
function say(message, type) {
  statusEl.textContent = message;
  statusEl.className = type || '';
}

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  if (form.elements['botcheck'].checked || !currentUser) return; // spam trap

  const f = new FormData(form);
  const btn = form.querySelector('button[type="submit"]');
  say('Sending...');
  btn.disabled = true;

  // Jo data Firebase mein save hoga
  const record = {
    uid: currentUser.uid,
    name: f.get('name'),
    phone: f.get('phone'),
    email: f.get('email'),
    business_name: f.get('business_name'),
    photo_link: f.get('photo_link') || '',
    about_business: f.get('about_business'),
    website_requirements: f.get('website_requirements') || '',
    maintenance: f.get('maintenance'),
    createdAt: serverTimestamp()
  };

  // Kaam 1: Firebase mein save karo
  const tasks = [addDoc(collection(db, 'enquiries'), record)];

  // Kaam 2: Email bhejo (jab Web3Forms key daali ho)
  const key = f.get('access_key');
  if (key && key !== 'YOUR_WEB3FORMS_KEY') {
    tasks.push(
      fetch('https://api.web3forms.com/submit', {
        method: 'POST',
        headers: { 'Accept': 'application/json' },
        body: f
      })
        .then(r => r.json())
        .then(d => { if (!d.success) throw new Error(d.message); })
    );
  }

  const results = await Promise.allSettled(tasks);
  btn.disabled = false;

  // Console mein dikhao ki kaunsa kaam chala (debug ke liye)
  console.log('Firebase save:', results[0].status);
  if (results[1]) console.log('Email:', results[1].status, results[1].reason || '');

  if (results.some(r => r.status === 'fulfilled')) {
    form.reset();
    form.hidden = true;
    successEl.hidden = false;
    successEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
    say('');
  } else {
    say('Could not send. Please check your internet and try again, or call us.', 'error');
  }
});

// "Submit another" button
document.getElementById('again-btn').addEventListener('click', () => {
  successEl.hidden = true;
  form.hidden = false;
});