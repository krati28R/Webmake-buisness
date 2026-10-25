import { auth, db, onAuthStateChanged, signOut, doc, getDoc, addDoc, collection, serverTimestamp } from "./firebase.js";
import { CONFIG } from "./config.js";

const $ = (id) => document.getElementById(id);
const page = document.body.dataset.page;
let user, profile = {};

// Top bar (same on every page)
$('top').className = 'nav';
$('top').innerHTML = '<a href="index.html" class="logo"><svg width="40" height="40" viewBox="0 0 64 64"><rect width="64" height="64" rx="14" fill="#0e4a5a"/><path d="M11 20 L21.5 46 L32 27 L42.5 46 L53 20" fill="none" stroke="#f2a93b" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/></svg><span>WebMaker</span></a><div class="nav-r"><span class="hello" id="hello"></span><button class="link-btn" id="signout">Sign out</button></div>';

// Phone and email links (from config.js)
document.querySelectorAll('.ph').forEach(a => { a.href = 'tel:' + CONFIG.phoneLink; a.textContent = CONFIG.phoneShow; });
document.querySelectorAll('.em').forEach(a => { a.href = 'mailto:' + CONFIG.email; a.textContent = CONFIG.email; });

// Scroll reveal
const io = new IntersectionObserver((es) => es.forEach(e => {
  if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
}), { threshold: 0.15 });
document.querySelectorAll('.reveal').forEach(el => io.observe(el));

// Typewriter heading
const ty = $('type');
if (ty) {
  const s = ty.dataset.text; let i = 0;
  const k = () => { ty.textContent = s.slice(0, ++i); if (i < s.length) setTimeout(k, 70); };
  setTimeout(k, 500);
}

// Login check
onAuthStateChanged(auth, async (u) => {
  if (!u) { location.href = 'intro.html'; return; }
  user = u;
  try {
    const snap = await getDoc(doc(db, 'users', u.uid));
    if (!snap.exists()) { location.href = 'profile.html'; return; }
    profile = snap.data();
  } catch (err) { /* show page anyway */ }
  $('hello').textContent = 'Hi, ' + (profile.name || '').split(' ')[0];
  if (page === 'business') {
    const el = $('bf').elements;
    el['name'].value = profile.name || '';
    el['phone'].value = profile.phone || '';
    el['email'].value = profile.email || u.email || '';
  }
  document.body.classList.remove('pending');
});
$('signout').onclick = async () => { await signOut(auth); location.href = 'intro.html'; };

const say = (id, m, t) => { const e = $(id); e.textContent = m; e.className = t || ''; };

// Business form: save in Firebase, email you, then go to thank you page
if (page === 'business') {
  const form = $('bf');
  form.addEventListener('submit', async (ev) => {
    ev.preventDefault();
    if (form.elements['botcheck'].checked || !user) return;
    const btn = form.querySelector('button[type=submit]');
    const f = new FormData(form);
    const g = (k) => (f.get(k) || '').toString().trim();
    say('fs', 'Sending...');
    btn.disabled = true;

    const record = { uid: user.uid, createdAt: serverTimestamp() };
    ['name','phone','email','business_name','business_type','about_business','address','city','state','pincode',
     'maps_link','logo_link','photo_link','more_links','website_requirements','maintenance'].forEach(k => record[k] = g(k));

    const tasks = [addDoc(collection(db, 'enquiries'), record)];
    if (CONFIG.web3formsKey && !CONFIG.web3formsKey.startsWith('PASTE')) {
      f.append('access_key', CONFIG.web3formsKey);
      f.append('subject', 'New business enquiry: ' + record.business_name);
      tasks.push(fetch('https://api.web3forms.com/submit', { method: 'POST', headers: { Accept: 'application/json' }, body: f })
        .then(r => r.json()).then(d => { if (!d.success) throw new Error(d.message); }));
    }
    const res = await Promise.allSettled(tasks);
    console.log('Firebase:', res[0].status, '| Email:', res[1] ? res[1].status : 'skipped');
    if (res.some(r => r.status === 'fulfilled')) { location.href = 'thanks.html'; }
    else { btn.disabled = false; say('fs', 'Could not send. Check your internet and try again, or call us.', 'error'); }
  });
}

// Thank you page: stars + feedback
if (page === 'thanks') {
  let rating = 0;
  const btns = [...document.querySelectorAll('#stars button')];
  btns.forEach(b => b.onclick = () => { rating = +b.dataset.v; btns.forEach(x => x.classList.toggle('on', +x.dataset.v <= rating)); });
  $('rf').onsubmit = async (ev) => {
    ev.preventDefault();
    if (!rating) { say('rs', 'Please tap a star rating.', 'error'); return; }
    try {
      await addDoc(collection(db, 'reviews'), {
        uid: user.uid, name: (profile.name || 'Client').split(' ')[0], rating,
        text: $('rtext').value.trim(), approved: false, createdAt: serverTimestamp()
      });
      $('rf').hidden = true; $('rdone').hidden = false;
    } catch (err) { say('rs', 'Could not send. Please try again.', 'error'); }
  };
}