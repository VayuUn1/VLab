import { initializeApp } from "https://gstatic.com";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, updateProfile, onAuthStateChanged, signOut } from "https://gstatic.com";
import { getFirestore, doc, getDoc, setDoc, deleteDoc, collection, onSnapshot } from "https://gstatic.com";

const logo = document.getElementById('logo');
const regModal = document.getElementById('register-modal');
const logModal = document.getElementById('login-modal');
const onlineModal = document.getElementById('online-modal');

let audioCtx = null, isEntering = false, isAuth = false;
let downOnLogo = false, startX = 0, startY = 0;

// 1. Buttons & Modals
document.getElementById('open-register').onclick = () => {
  document.getElementById('reg-error').textContent = '';
  regModal.classList.add('open');
};
document.getElementById('open-login').onclick = () => {
  document.getElementById('login-error').textContent = '';
  logModal.classList.add('open');
};
document.getElementById('online-toggle-btn').onclick = () => {
  onlineModal.classList.add('open');
};
document.querySelectorAll('[data-close]').forEach(btn => {
  btn.onclick = () => {
    regModal.classList.remove('open');
    logModal.classList.remove('open');
    onlineModal.classList.remove('open');
  };
});

// 2. Real-time Mobile Touch Drag Scale on VLAB
function checkTouch(e) {
  if (isEntering || document.querySelector('.modal-backdrop.open')) return;
  if (!e.touches || !e.touches.length) {
    logo.classList.remove('active');
    return;
  }
  const t = e.touches.item(0);
  const el = document.elementFromPoint(t.clientX, t.clientY);
  logo.classList.toggle('active', el === logo || logo.contains(el));
}
window.addEventListener('touchstart', checkTouch, { passive: true });
window.addEventListener('touchmove', checkTouch, { passive: true });
window.addEventListener('touchend', () => logo.classList.remove('active'));

// 3. Single-Tap Detector + Inverted Jump
logo.onpointerdown = (e) => {
  if (!isEntering) {
    downOnLogo = true;
    startX = e.clientX;
    startY = e.clientY;
  }
};
window.onpointerup = (e) => {
  if (!downOnLogo || isEntering) return;
  downOnLogo = false;
  const dist = Math.hypot(e.clientX - startX, e.clientY - startY);
  if (dist < 12 && document.elementFromPoint(e.clientX, e.clientY) === logo) {
    if (!isAuth) {
      logo.classList.remove('shake');
      void logo.offsetWidth;
      logo.classList.add('shake');
      return;
    }
    isEntering = true;
    logo.classList.remove('active');
    playSound();
    document.body.classList.add('entering');
  }
};

// 4. Glassy Bubble Chime Sound
function playSound() {
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  if (audioCtx.state === 'suspended') audioCtx.resume();
  const now = audioCtx.currentTime;
  const delay = audioCtx.createDelay(); delay.delayTime.value = 0.14;
  const fb = audioCtx.createGain(); fb.gain.value = 0.28;
  const wet = audioCtx.createGain(); wet.gain.value = 0.35;
  delay.connect(fb); fb.connect(delay); delay.connect(wet); wet.connect(audioCtx.destination);

  const pop = audioCtx.createOscillator(), popG = audioCtx.createGain();
  pop.frequency.setValueAtTime(320, now);
  pop.frequency.exponentialRampToValueAtTime(880, now + 0.065);
  popG.gain.setValueAtTime(0.001, now);
  popG.gain.exponentialRampToValueAtTime(0.22, now + 0.01);
  popG.gain.exponentialRampToValueAtTime(0.0001, now + 0.08);
  pop.connect(popG); popG.connect(audioCtx.destination); pop.start(now); pop.stop(now + 0.09);

  [1046.5, 1567.98].forEach((f, i) => {
    const o = audioCtx.createOscillator(), g = audioCtx.createGain(), t = now + 0.045 + i * 0.075;
    o.frequency.setValueAtTime(f, t);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.14, t + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.45);
    o.connect(g); g.connect(audioCtx.destination); g.connect(delay); o.start(t); o.stop(t + 0.48);
  });
}

// 5. Firebase Auth, Logout & Online Players
const app = initializeApp({
  apiKey: "AIzaSyBceBIsTrGK6BRr5um9Sxj1BIEAgdZnKJQ",
  authDomain: "://firebaseapp.com",
  projectId: "vlab-75355",
  storageBucket: "vlab-75355.firebasestorage.app",
  messagingSenderId: "942029676825",
  appId: "1:942029676825:web:77cf57b966caa2d6822588"
});
const auth = getAuth(app);
const db = getFirestore(app);
let heartbeat = null, currentUid = null, latestDocs = [];

onAuthStateChanged(auth, (user) => {
  clearInterval(heartbeat);
  if (user) {
    isAuth = true;
    currentUid = user.uid;
    document.body.classList.add('authenticated');
    regModal.classList.remove('open');
    logModal.classList.remove('open');
    const ping = () => setDoc(doc(db, "online", user.uid), {
      name: user.displayName || "Player",
      lastSeen: Date.now()
    });
    ping();
    heartbeat = setInterval(ping, 20000);
  }
});

document.getElementById('logout-btn').onclick = async () => {
  clearInterval(heartbeat);
  if (currentUid) {
    try { await deleteDoc(doc(db, "online", currentUid)); } catch (e) {}
  }
  await signOut(auth);
  location.reload();
};

window.addEventListener('beforeunload', () => {
  if (currentUid) deleteDoc(doc(db, "online", currentUid));
});

function renderOnline() {
  const active = latestDocs.filter(p => Date.now() - (p.lastSeen || 0) < 45000);
  document.getElementById('online-count').textContent = active.length;
  document.getElementById('modal-online-count').textContent = active.length;
  document.getElementById('online-list').innerHTML = active.length
    ? active.map(p => `<div class="online-row"><span class="live-dot"></span><span>${p.name.replace(/</g, "&lt;")}</span></div>`).join('')
    : '<p style="text-align:center;color:#666;">No players online</p>';
}

onSnapshot(collection(db, "online"), (snap) => {
  latestDocs = snap.docs.map(d => d.data());
  renderOnline();
});
setInterval(renderOnline, 10000);

document.getElementById('register-form').onsubmit = async (e) => {
  e.preventDefault();
  const email = document.getElementById('reg-email').value.trim();
  const name = document.getElementById('reg-name').value.trim();
  const pass = document.getElementById('reg-pass').value;
  const err = document.getElementById('reg-error');
  const btn = document.getElementById('reg-submit');

  if (pass !== document.getElementById('reg-confirm').value) {
    err.textContent = 'Passwords do not match!';
    return;
  }
  btn.disabled = true;
  err.textContent = 'Checking name...';
  try {
    const snap = await getDoc(doc(db, "usernames", name.toLowerCase()));
    if (snap.exists()) {
      err.textContent = 'That name is already taken!';
      btn.disabled = false;
      return;
    }
    const cred = await createUserWithEmailAndPassword(auth, email, pass);
    await updateProfile(cred.user, { displayName: name });
    await setDoc(doc(db, "usernames", name.toLowerCase()), { uid: cred.user.uid, name });
  } catch (ex) {
    err.textContent = ex.message.replace('Firebase: ', '');
    btn.disabled = false;
  }
};

document.getElementById('login-form').onsubmit = async (e) => {
  e.preventDefault();
  const name = document.getElementById('login-name').value.trim();
  const email = document.getElementById('login-email').value.trim();
  const pass = document.getElementById('login-pass').value;
  const err = document.getElementById('login-error');
  const btn = document.getElementById('login-submit');

  btn.disabled = true;
  err.textContent = 'Logging in...';
  try {
    const cred = await signInWithEmailAndPassword(auth, email, pass);
    if ((cred.user.displayName || '').toLowerCase() !== name.toLowerCase()) {
      err.textContent = 'Name does not match this account!';
      btn.disabled = false;
    }
  } catch (ex) {
    err.textContent = 'Invalid name, email, or password!';
    btn.disabled = false;
  }
};
