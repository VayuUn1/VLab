
const logo = document.getElementById('logo');
const regModal = document.getElementById('register-modal');
const logModal = document.getElementById('login-modal');
const onlineModal = document.getElementById('online-modal');

const logoutBtn = document.getElementById('logout-btn');
const loginBtn = document.getElementById('open-login');
const registerBtn = document.getElementById('open-register');
const onlineBtn = document.getElementById('online-toggle-btn');

let audioCtx = null;
let isEntering = false;
let isAuth = false;
let downOnLogo = false;
let startX = 0;
let startY = 0;

let auth = null;
let db = null;
let heartbeat = null;
let currentUid = null;
let latestDocs = [];

// ------------------------------
// MODALS
// ------------------------------

registerBtn.onclick = () => {
  document.getElementById('reg-error').textContent = '';
  regModal.classList.add('open');
};

loginBtn.onclick = () => {
  document.getElementById('login-error').textContent = '';
  logModal.classList.add('open');
};

onlineBtn.onclick = () => {
  onlineModal.classList.add('open');
};

document.querySelectorAll('[data-close]').forEach(btn => {
  btn.onclick = () => {
    regModal.classList.remove('open');
    logModal.classList.remove('open');
    onlineModal.classList.remove('open');
  };
});

// ------------------------------
// TOUCH EFFECT
// ------------------------------

function checkTouch(e) {
  if (isEntering || document.querySelector('.modal-backdrop.open')) return;

  if (!e.touches || !e.touches.length) {
    logo.classList.remove('active');
    return;
  }

  const t = e.touches.item(0);
  const el = document.elementFromPoint(t.clientX, t.clientY);

  logo.classList.toggle(
    'active',
    el === logo || logo.contains(el)
  );
}

window.addEventListener('touchstart', checkTouch, { passive: true });
window.addEventListener('touchmove', checkTouch, { passive: true });

window.addEventListener('touchend', () => {
  logo.classList.remove('active');
});

// ------------------------------
// LOGO CLICK
// ------------------------------

logo.onpointerdown = (e) => {
  if (isEntering) return;

  downOnLogo = true;
  startX = e.clientX;
  startY = e.clientY;
};

window.addEventListener('pointercancel', () => {
  downOnLogo = false;
});

window.addEventListener('pointerup', (e) => {
  if (!downOnLogo || isEntering) return;

  downOnLogo = false;

  const distance = Math.hypot(
    e.clientX - startX,
    e.clientY - startY
  );

  const target = document.elementFromPoint(e.clientX, e.clientY);
  const clickedLogo = target === logo || logo.contains(target);

  if (distance >= 12 || !clickedLogo) return;

  // Locked logo
  if (!isAuth) {
    logo.classList.remove('shake');
    void logo.offsetWidth;
    logo.classList.add('shake');
    return;
  }

  // Unlocked logo
  isEntering = true;
  logo.classList.remove('active');

  playSound();
  document.body.classList.add('entering');
});

// ------------------------------
// SOUND EFFECT
// ------------------------------

function playSound() {
  if (!audioCtx) {
    audioCtx = new (
      window.AudioContext || window.webkitAudioContext
    )();
  }

  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }

  const now = audioCtx.currentTime;

  const delay = audioCtx.createDelay();
  delay.delayTime.value = 0.14;

  const feedback = audioCtx.createGain();
  feedback.gain.value = 0.28;

  const wet = audioCtx.createGain();
  wet.gain.value = 0.35;

  delay.connect(feedback);
  feedback.connect(delay);
  delay.connect(wet);
  wet.connect(audioCtx.destination);

  // Pop sound
  const pop = audioCtx.createOscillator();
  const popGain = audioCtx.createGain();

  pop.frequency.setValueAtTime(320, now);
  pop.frequency.exponentialRampToValueAtTime(880, now + 0.065);

  popGain.gain.setValueAtTime(0.001, now);
  popGain.gain.exponentialRampToValueAtTime(0.22, now + 0.01);
  popGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.08);

  pop.connect(popGain);
  popGain.connect(audioCtx.destination);

  pop.start(now);
  pop.stop(now + 0.09);

  // Marimba chime
  [1046.5, 1567.98].forEach((frequency, i) => {
    const oscillator = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    const time = now + 0.045 + i * 0.075;

    oscillator.frequency.setValueAtTime(frequency, time);

    gain.gain.setValueAtTime(0.0001, time);
    gain.gain.exponentialRampToValueAtTime(0.14, time + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.45);

    oscillator.connect(gain);
    gain.connect(audioCtx.destination);
    gain.connect(delay);

    oscillator.start(time);
    oscillator.stop(time + 0.48);
  });
}

// ------------------------------
// AUTHENTICATION UI
// ------------------------------

function updateAuthUI(user) {
  isAuth = !!user;
  currentUid = user ? user.uid : null;

  document.body.classList.toggle('authenticated', isAuth);

  if (isAuth) {
    regModal.classList.remove('open');
    logModal.classList.remove('open');
  } else {
    clearInterval(heartbeat);
    heartbeat = null;
  }
}

// ------------------------------
// FIREBASE
// ------------------------------

async function startFirebase() {
  try {
    const { initializeApp } = await import(
      'https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js'
    );

    const {
      getAuth,
      createUserWithEmailAndPassword,
      signInWithEmailAndPassword,
      updateProfile,
      onAuthStateChanged,
      signOut
    } = await import(
      'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js'
    );

    const {
      getFirestore,
      doc,
      getDoc,
      setDoc,
      deleteDoc,
      collection,
      onSnapshot
    } = await import(
      'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js'
    );

    const app = initializeApp({
      apiKey: "AIzaSyBceBIsTrGK6BRr5um9Sxj1BIEAgdZnKJQ",
      authDomain: "vlab-75355.firebaseapp.com",
      projectId: "vlab-75355",
      storageBucket: "vlab-75355.firebasestorage.app",
      messagingSenderId: "942029676825",
      appId: "1:942029676825:web:77cf57b966caa2d6822588"
    });

    auth = getAuth(app);
    db = getFirestore(app);

    console.log('VLAB Firebase connected!');

    // ------------------------------
    // AUTH STATE LISTENER
    // ------------------------------

    onAuthStateChanged(auth, (user) => {
      updateAuthUI(user);

      if (!user) return;

      const ping = async () => {
        try {
          await setDoc(doc(db, 'online', user.uid), {
            name: user.displayName || 'Player',
            lastSeen: Date.now()
          });
        } catch (error) {
          console.error('Online heartbeat failed:', error);
        }
      };

      ping();

      clearInterval(heartbeat);
      heartbeat = setInterval(ping, 20000);
    });

    // ------------------------------
    // LOGOUT
    // ------------------------------

    logoutBtn.onclick = async () => {
      logoutBtn.disabled = true;

      try {
        if (currentUid) {
          try {
            await deleteDoc(doc(db, 'online', currentUid));
          } catch (error) {
            console.warn('Could not remove online status:', error);
          }
        }

        await signOut(auth);

        // onAuthStateChanged updates the UI automatically.
      } catch (error) {
        console.error('Logout failed:', error);
        alert('Could not log out. Please try again.');
      } finally {
        logoutBtn.disabled = false;
      }
    };

    // ------------------------------
    // REMOVE ONLINE STATUS ON EXIT
    // ------------------------------

    window.addEventListener('beforeunload', () => {
      if (currentUid) {
        deleteDoc(doc(db, 'online', currentUid));
      }
    });

    // ------------------------------
    // ONLINE PLAYER LIST
    // ------------------------------

    function renderOnline() {
      const active = latestDocs.filter(player =>
        Date.now() - (player.lastSeen || 0) < 45000
      );

      document.getElementById('online-count').textContent = active.length;
      document.getElementById('modal-online-count').textContent = active.length;

      const list = document.getElementById('online-list');
      list.replaceChildren();

      if (active.length === 0) {
        const message = document.createElement('p');
        message.style.textAlign = 'center';
        message.style.color = '#666';
        message.textContent = 'No players online';
        list.appendChild(message);
        return;
      }

      active.forEach(player => {
        const row = document.createElement('div');
        row.className = 'online-row';

        const dot = document.createElement('span');
        dot.className = 'live-dot';

        const name = document.createElement('span');
        name.textContent = player.name || 'Player';

        row.append(dot, name);
        list.appendChild(row);
      });
    }

    onSnapshot(
      collection(db, 'online'),
      (snapshot) => {
        latestDocs = snapshot.docs.map(d => d.data());
        renderOnline();
      },
      (error) => {
        console.error('Online list error:', error);
      }
    );

    setInterval(renderOnline, 10000);

    // ------------------------------
    // REGISTER
    // ------------------------------

    document.getElementById('register-form').onsubmit = async (e) => {
      e.preventDefault();

      const email = document.getElementById('reg-email').value.trim();
      const name = document.getElementById('reg-name').value.trim();
      const pass = document.getElementById('reg-pass').value;
      const confirm = document.getElementById('reg-confirm').value;

      const errorMessage = document.getElementById('reg-error');
      const button = document.getElementById('reg-submit');

      if (pass !== confirm) {
        errorMessage.textContent = 'Passwords do not match!';
        return;
      }

      button.disabled = true;
      errorMessage.textContent = 'Checking name...';

      try {
        const usernameRef = doc(db, 'usernames', name.toLowerCase());
        const usernameSnap = await getDoc(usernameRef);

        if (usernameSnap.exists()) {
          errorMessage.textContent = 'That name is already taken!';
          return;
        }

        const credential = await createUserWithEmailAndPassword(
          auth,
          email,
          pass
        );

        await updateProfile(credential.user, {
          displayName: name
        });

        await setDoc(usernameRef, {
          uid: credential.user.uid,
          name: name
        });

        errorMessage.textContent = '';

      } catch (error) {
        console.error('Registration error:', error);
        errorMessage.textContent = error.message.replace('Firebase: ', '');
      } finally {
        button.disabled = false;
      }
    };

    // ------------------------------
    // LOGIN
    // ------------------------------

    document.getElementById('login-form').onsubmit = async (e) => {
      e.preventDefault();

      const name = document.getElementById('login-name').value.trim();
      const email = document.getElementById('login-email').value.trim();
      const pass = document.getElementById('login-pass').value;

      const errorMessage = document.getElementById('login-error');
      const button = document.getElementById('login-submit');

      button.disabled = true;
      errorMessage.textContent = 'Logging in...';

      try {
        const credential = await signInWithEmailAndPassword(
          auth,
          email,
          pass
        );

        const accountName = credential.user.displayName || '';

        if (accountName.toLowerCase() !== name.toLowerCase()) {
          await signOut(auth);

          logModal.classList.add('open');
          errorMessage.textContent = 'Name does not match this account!';
          return;
        }

        errorMessage.textContent = '';

      } catch (error) {
        console.error('Login error:', error);

        errorMessage.textContent =
          'Invalid name, email, or password!';

      } finally {
        button.disabled = false;
      }
    };

  } catch (error) {
    console.error('Firebase initialization failed:', error);
    alert('VLAB could not connect to Firebase. Check the browser console.');
  }
}

// START VLAB
startFirebase();
