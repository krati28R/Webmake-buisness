// ---------- 1. Mobile menu ----------
const menuBtn = document.querySelector('.menu-btn');
const links = document.getElementById('links');

if (menuBtn && links) {
  menuBtn.addEventListener('click', () => {
    const open = links.classList.toggle('open');
    menuBtn.setAttribute('aria-expanded', open);
  });
  links.querySelectorAll('a').forEach(a =>
    a.addEventListener('click', () => {
      links.classList.remove('open');
      menuBtn.setAttribute('aria-expanded', 'false');
    })
  );
}

// ---------- 2. Sign in popup (placeholder) ----------
const signinBtn = document.getElementById('signin-btn');
const signinDialog = document.getElementById('signin-dialog');
const signinClose = document.getElementById('signin-close');

if (signinBtn && signinDialog) {
  signinBtn.addEventListener('click', () => {
    if (links) links.classList.remove('open');
    signinDialog.showModal();
  });
  signinClose.addEventListener('click', () => signinDialog.close());
}

// ---------- 3. Scroll reveal ----------
const revealEls = document.querySelectorAll('.reveal');

if ('IntersectionObserver' in window) {
  const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('in');
        revealObserver.unobserve(entry.target);
      }
    });
  }, { threshold: 0.1 });

  revealEls.forEach((el, i) => {
    el.style.transitionDelay = (i % 3) * 0.1 + 's';
    revealObserver.observe(el);
  });
} else {
  revealEls.forEach(el => el.classList.add('in'));
}

// ---------- 4. Contact form ----------
const form = document.getElementById('contact-form');
const statusEl = document.getElementById('form-status');

function showStatus(message, type) {
  if (!statusEl) return;
  statusEl.textContent = message;
  statusEl.className = type || '';
}

if (form) {
  const submitBtn = form.querySelector('button[type="submit"]');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const key = form.querySelector('[name="access_key"]').value;
    if (!key || key === 'YOUR_WEB3FORMS_KEY') {
      showStatus('Setup needed: paste your Web3Forms access key in index.html.', 'error');
      return;
    }

    showStatus('Sending...');
    submitBtn.disabled = true;

    try {
      const res = await fetch('https://api.web3forms.com/submit', {
        method: 'POST',
        headers: { 'Accept': 'application/json' },
        body: new FormData(form)
      });
      const data = await res.json();
      if (data.success) {
        showStatus('Details sent. We will contact you as soon as we can.', 'ok');
        form.reset();
      } else {
        showStatus('Could not send: ' + (data.message || 'please check your details and try again.'), 'error');
      }
    } catch (err) {
      showStatus('No connection. Please try again or call us.', 'error');
    } finally {
      submitBtn.disabled = false;
    }
  });
}