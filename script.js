import {
  auth, db, onAuthStateChanged, signOut,
  doc, getDoc, addDoc, collection, serverTimestamp
} from "./firebase.js";
import { getDocs, query, where, limit } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { CONFIG } from "./config.js";

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

// ---------- 3. Footer phone and email (from config.js) ----------
const phoneEl = document.getElementById('footer-phone');
const emailEl = document.getElementById('footer-email');
phoneEl.textContent = CONFIG.phoneShow;
phoneEl.href = 'tel:' + CONFIG.phoneLink;
emailEl.textContent = CONFIG.email;
emailEl.href = 'mailto:' + CONFIG.email;

// ---------- 4. Login check ----------
const form = document.getElementById('contact-form');
const statusEl = document.getElementById('form-status');
const successEl = document.getElementById('success');
let currentUser = null;
let profile = {};

function prefill() {
  form.elements['name'].value = profile.name || '';
  form.elements['phone'].value = profile.phone || '';
  form.elements['email'].value = profile.email || (currentUser && currentUser.email) || '';
}

onAuthStateChanged(auth, async (user) => {
  if (!user) { location.href = 'login.html'; return; }
  currentUser = user;
  try {
    const snap = await getDoc(doc(db, 'users', user.uid));
    if (!snap.exists()) { location.href = 'profile.html'; return; }
    profile = snap.data();
    document.getElementById('hello').textContent = 'Hi, ' + (profile.name || '').split(' ')[0];
    prefill();
  } catch (err) { /* show the page anyway */ }
  document.body.classList.remove('pending');
  loadReviews();
});

document.getElementById('signout-btn').addEventListener('click', async () => {
  await signOut(auth);
  location.href = 'login.html';
});

// ---------- 5. Reviews: show only approved ones ----------
const stars = (n) => '\u2605'.repeat(n) + '\u2606'.repeat(5 - n);

async function loadReviews() {
  try {
    const snap = await getDocs(query(collection(db, 'reviews'), where('approved', '==', true), limit(50)));
    const items = snap.docs.map(d => d.data())
      .sort((a, b) => ((b.createdAt && b.createdAt.seconds) || 0) - ((a.createdAt && a.createdAt.seconds) || 0));
    if (!items.length) return;

    const avg = items.reduce((sum, r) => sum + r.rating, 0) / items.length;
    document.getElementById('avg-score').textContent = avg.toFixed(1);
    document.getElementById('avg-stars').textContent = stars(Math.round(avg));
    document.getElementById('review-count').textContent = 'from ' + items.length + (items.length === 1 ? ' review' : ' reviews');
    document.getElementById('rating-summary').hidden = false;
    document.getElementById('no-reviews').hidden = true;

    const list = document.getElementById('review-list');
    list.innerHTML = '';
    items.forEach(r => {
      const card = document.createElement('div');
      card.className = 'review';
      const s = document.createElement('div');
      s.className = 'stars';
      s.textContent = stars(r.rating);
      const p = document.createElement('p');
      p.textContent = r.text;
      const c = document.createElement('cite');
      c.textContent = '\u2014 ' + (r.name || 'Client');
      card.append(s, p, c);
      list.appendChild(card);
    });
  } catch (err) { console.log('Reviews not loaded:', err); }
}

// ---------- 6. Rating popup ----------
const reviewDialog = document.getElementById('review-dialog');
const reviewForm = document.getElementById('review-form');
const reviewStatus = document.getElementById('review-status');
const starBtns = [...document.querySelectorAll('#star-input button')];
let chosen = 0;

function paint(n) { starBtns.forEach(b => b.classList.toggle('on', Number(b.dataset.v) <= n)); }
starBtns.forEach(b => b.addEventListener('click', () => { chosen = Number(b.dataset.v); paint(chosen); }));

function openReview() {
  chosen = 0; paint(0);
  reviewForm.reset();
  reviewStatus.textContent = '';
  reviewDialog.showModal();
}
document.getElementById('write-review-btn').addEventListener('click', openReview);
document.getElementById('review-close').addEventListener('click', () => reviewDialog.close());

reviewForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  if (!chosen) { reviewStatus.textContent = 'Please tap a star rating.'; return; }
  reviewStatus.textContent = 'Sending...';
  try {
    await addDoc(collection(db, 'reviews'), {
      uid: currentUser.uid,
      name: (profile.name || 'Client').split(' ')[0],
      rating: chosen,
      text: document.getElementById('review-text').value.trim(),
      approved: false,               // you approve it in Firebase before it shows
      createdAt: serverTimestamp()
    });
    reviewStatus.textContent = 'Thank you! Your review will appear after we approve it.';
    setTimeout(() => reviewDialog.close(), 2200);
  } catch (err) {
    reviewStatus.textContent = 'Could not send the review. Please try again.';
  }
});

// ---------- 7. Business form: save in Firebase and email you ----------
function say(message, type) { statusEl.textContent = message; statusEl.className = type || ''; }

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  if (form.elements['botcheck'].checked || !currentUser) return;

  const f = new FormData(form);
  const btn = form.querySelector('button[type="submit"]');
  say('Sending...');
  btn.disabled = true;

  const get = (k) => (f.get(k) || '').toString().trim();
  const record = {
    uid: currentUser.uid,
    name: get('name'), phone: get('phone'), email: get('email'),
    business_name: get('business_name'), business_type: get('business_type'),
    about_business: get('about_business'),
    address: get('address'), city: get('city'), state: get('state'),
    pincode: get('pincode'), maps_link: get('maps_link'),
    logo_link: get('logo_link'), photo_link: get('photo_link'), more_links: get('more_links'),
    website_requirements: get('website_requirements'),
    maintenance: get('maintenance'),
    createdAt: serverTimestamp()
  };

  const tasks = [addDoc(collection(db, 'enquiries'), record)];

  if (CONFIG.web3formsKey && !CONFIG.web3formsKey.startsWith('PASTE')) {
    f.append('access_key', CONFIG.web3formsKey);
    f.append('subject', 'New business enquiry: ' + record.business_name);
    tasks.push(
      fetch('https://api.web3forms.com/submit', {
        method: 'POST', headers: { 'Accept': 'application/json' }, body: f
      }).then(r => r.json()).then(d => { if (!d.success) throw new Error(d.message); })
    );
  } else {
    console.log('Email skipped: add your Web3Forms key in config.js');
  }

  const results = await Promise.allSettled(tasks);
  btn.disabled = false;
  console.log('Firebase save:', results[0].status);
  if (results[1]) console.log('Email:', results[1].status, results[1].reason || '');

  if (results.some(r => r.status === 'fulfilled')) {
    form.reset();
    form.hidden = true;
    successEl.hidden = false;
    successEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
    say('');
    setTimeout(openReview, 1200);      // ask for rating and feedback
  } else {
    say('Could not send. Please check your internet and try again, or call us.', 'error');
  }
});

document.getElementById('again-btn').addEventListener('click', () => {
  successEl.hidden = true;
  form.hidden = false;
  prefill();
});