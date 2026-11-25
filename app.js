
// ==========================================
// VLAB - MAIN APP
// ==========================================

const dbg = document.getElementById("debug");

function showStatus(message) {
  if (dbg) dbg.textContent = message;
}

showStatus("VLAB is starting...");

// ==========================================
// ELEMENTS
// ==========================================

const logo = document.getElementById("logo");
const regModal = document.getElementById("register-modal");
const logModal = document.getElementById("login-modal");
const onlineModal = document.getElementById("online-modal");

const registerForm = document.getElementById("register-form");
const loginForm = document.getElementById("login-form");

const regError = document.getElementById("reg-error");
const loginError = document.getElementById("login-error");

let audioCtx = null;
let isEntering = false;
let isAuth = false;
let downOnLogo = false;
let startX = 0;
let startY = 0;

let firebaseReady = false;
let firebaseError = null;

let auth = null;
let db = null;

let heartbeat = null;
let currentUid = null;
let latestDocs = [];

let firebaseFunctions = null;

// ==========================================
// IMPORTANT: PREVENT FORM URL SUBMISSION
// ==========================================

// These handlers are attached BEFORE Firebase loads.
// This prevents passwords from appearing in the URL.

registerForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  if (!firebaseReady) {
    regError.textContent = firebaseError
      ? "VLAB could not connect. Check the status message below."
      : "Please wait! VLAB is connecting...";
    return;
  }

  await handleRegister();
});

loginForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  if (!firebaseReady) {
    loginError.textContent = firebaseError
      ? "VLAB could not connect. Check the status message below."
      : "Please wait! VLAB is connecting...";
    return;
  }

  await handleLogin();
});

// ==========================================
// MODALS
// ==========================================

document.getElementById("open-register").onclick = () => {
  regError.textContent = "";
  regModal.classList.add("open");
};

document.getElementById("open-login").onclick = () => {
  loginError.textContent = "";
  logModal.classList.add("open");
};

document.getElementById("online-toggle-btn").onclick = () => {
  onlineModal.classList.add("open");
};

document.querySelectorAll("[data-close]").forEach((btn) => {
  btn.onclick = () => {
    regModal.classList.remove("open");
    logModal.classList.remove("open");
    onlineModal.classList.remove("open");
  };
});

// ==========================================
// LOGO TOUCH EFFECT
// ==========================================

function checkTouch(e) {
  if (isEntering || document.querySelector(".modal-backdrop.open")) {
    return;
  }

  if (!e.touches || !e.touches.length) {
    logo.classList.remove("active");
    return;
  }

  const t = e.touches.item(0);
  const el = document.elementFromPoint(t.clientX, t.clientY);

  logo.classList.toggle(
    "active",
    el === logo || logo.contains(el)
  );
}

window.addEventListener("touchstart", checkTouch, {
  passive: true
});

window.addEventListener("touchmove", checkTouch, {
  passive: true
});

window.addEventListener("touchend", () => {
  logo.classList.remove("active");
});

// ==========================================
// LOGO CLICK
// ==========================================

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

  const distance = Math.hypot(
    e.clientX - startX,
    e.clientY - startY
  );

  if (
    distance < 12 &&
    document.elementFromPoint(e.clientX, e.clientY) === logo
  ) {
    if (!isAuth) {
      logo.classList.remove("shake");
      void logo.offsetWidth;
      logo.classList.add("shake");
      return;
    }

    isEntering = true;
    logo.classList.remove("active");

    try {
      playSound();
    } catch (e) {
      console.warn("Sound could not play:", e);
    }

    document.body.classList.add("entering");
  }
};

// ==========================================
// LOGO SOUND
// ==========================================

function playSound() {
  if (!audioCtx) {
    audioCtx = new (
      window.AudioContext || window.webkitAudioContext
    )();
  }

  if (audioCtx.state === "suspended") {
    audioCtx.resume();
  }

  const now = audioCtx.currentTime;

  const delay = audioCtx.createDelay();
  delay.delayTime.value = 0.14;

  const fb = audioCtx.createGain();
  fb.gain.value = 0.28;

  const wet = audioCtx.createGain();
  wet.gain.value = 0.35;

  delay.connect(fb);
  fb.connect(delay);
  delay.connect(wet);
  wet.connect(audioCtx.destination);

  const pop = audioCtx.createOscillator();
  const popG = audioCtx.createGain();

  pop.frequency.setValueAtTime(320, now);
  pop.frequency.exponentialRampToValueAtTime(
    880,
    now + 0.065
  );

  popG.gain.setValueAtTime(0.001, now);
  popG.gain.exponentialRampToValueAtTime(
    0.22,
    now + 0.01
  );
  popG.gain.exponentialRampToValueAtTime(
    0.0001,
    now + 0.08
  );

  pop.connect(popG);
  popG.connect(audioCtx.destination);

  pop.start(now);
  pop.stop(now + 0.09);

  [1046.5, 1567.98].forEach((f, i) => {
    const o = audioCtx.createOscillator();
    const g = audioCtx.createGain();

    const t = now + 0.045 + i * 0.075;

    o.frequency.setValueAtTime(f, t);

    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(
      0.14,
      t + 0.012
    );
    g.gain.exponentialRampToValueAtTime(
      0.0001,
      t + 0.45
    );

    o.connect(g);
    g.connect(audioCtx.destination);
    g.connect(delay);

    o.start(t);
    o.stop(t + 0.48);
  });
}

// ==========================================
// FIREBASE CONNECTION
// ==========================================

async function startFirebase() {
  try {
    showStatus("Connecting to Firebase...");

    const appModule = await import(
      "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js"
    );

    const authModule = await import(
      "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js"
    );

    const firestoreModule = await import(
      "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js"
    );

    const {
      initializeApp
    } = appModule;

    const {
      getAuth,
      createUserWithEmailAndPassword,
      signInWithEmailAndPassword,
      updateProfile,
      onAuthStateChanged,
      signOut
    } = authModule;

    const {
      getFirestore,
      doc,
      getDoc,
      setDoc,
      deleteDoc,
      collection,
      onSnapshot
    } = firestoreModule;

    // Firebase configuration
    const firebaseConfig = {
      apiKey: "AIzaSyBceBIsTrGK6BRr5um9Sxj1BIEAgdZnKJQ",
      authDomain: "vlab-75355.firebaseapp.com",
      projectId: "vlab-75355",
      storageBucket: "vlab-75355.firebasestorage.app",
      messagingSenderId: "942029676825",
      appId: "1:942029676825:web:77cf57b966caa2d6822588"
    };

    const app = initializeApp(firebaseConfig);

    auth = getAuth(app);
    db = getFirestore(app);

    firebaseFunctions = {
      createUserWithEmailAndPassword,
      signInWithEmailAndPassword,
      updateProfile,
      onAuthStateChanged,
      signOut,
      doc,
      getDoc,
      setDoc,
      deleteDoc,
      collection,
      onSnapshot
    };

    firebaseReady = true;
    showStatus("Firebase connected! VLAB is ready.");

    // ======================================
    // AUTHENTICATION STATE
    // ======================================

    onAuthStateChanged(auth, (user) => {
      clearInterval(heartbeat);
      heartbeat = null;

      if (user) {
        isAuth = true;
        currentUid = user.uid;

        document.body.classList.add("authenticated");

        regModal.classList.remove("open");
        logModal.classList.remove("open");

        const ping = async () => {
          try {
            await setDoc(doc(db, "online", user.uid), {
              name: user.displayName || "Player",
              lastSeen: Date.now()
            });
          } catch (e) {
            console.warn("Online status update failed:", e);
          }
        };

        ping();
        heartbeat = setInterval(ping, 20000);

      } else {
        isAuth = false;
        currentUid = null;

        document.body.classList.remove("authenticated");
      }
    });

    // ======================================
    // LOGOUT
    // ======================================

    document.getElementById("logout-btn").onclick = async () => {
      try {
        clearInterval(heartbeat);
        heartbeat = null;

        if (currentUid) {
          try {
            await deleteDoc(doc(db, "online", currentUid));
          } catch (e) {
            console.warn("Could not remove online status:", e);
          }
        }

        await signOut(auth);

        location.reload();

      } catch (e) {
        showStatus("Logout failed: " + e.message);
      }
    };

    // ======================================
    // ONLINE PLAYERS
    // ======================================

    function renderOnline() {
      const active = latestDocs.filter((p) => {
        return Date.now() - (p.lastSeen || 0) < 45000;
      });

      document.getElementById("online-count").textContent =
        active.length;

      document.getElementById("modal-online-count").textContent =
        active.length;

      const list = document.getElementById("online-list");
      list.replaceChildren();

      if (active.length === 0) {
        const empty = document.createElement("p");
        empty.textContent = "No players online";
        empty.style.textAlign = "center";
        empty.style.color = "#666";
        list.appendChild(empty);
        return;
      }

      active.forEach((player) => {
        const row = document.createElement("div");
        row.className = "online-row";

        const dot = document.createElement("span");
        dot.className = "live-dot";

        const name = document.createElement("span");
        name.textContent = player.name || "Player";

        row.appendChild(dot);
        row.appendChild(name);
        list.appendChild(row);
      });
    }

    onSnapshot(
      collection(db, "online"),
      (snap) => {
        latestDocs = snap.docs.map((d) => d.data());
        renderOnline();
      },
      (error) => {
        console.error("Online list error:", error);
      }
    );

    setInterval(renderOnline, 10000);

  } catch (err) {
    firebaseReady = false;
    firebaseError = err;

    console.error("Firebase startup error:", err);

    showStatus("Firebase connection failed: " + err.message);
  }
}

// ==========================================
// REGISTER
// ==========================================

async function handleRegister() {
  const {
    createUserWithEmailAndPassword,
    updateProfile,
    doc,
    getDoc,
    setDoc
  } = firebaseFunctions;

  const email = document.getElementById("reg-email").value.trim();
  const name = document.getElementById("reg-name").value.trim();
  const pass = document.getElementById("reg-pass").value;
  const confirm = document.getElementById("reg-confirm").value;

  const btn = document.getElementById("reg-submit");

  if (!name) {
    regError.textContent = "Please enter a name!";
    return;
  }

  if (pass !== confirm) {
    regError.textContent = "Passwords do not match!";
    return;
  }

  btn.disabled = true;
  regError.textContent = "Checking name...";

  try {
    const usernameRef = doc(db, "usernames", name.toLowerCase());
    const usernameSnap = await getDoc(usernameRef);

    if (usernameSnap.exists()) {
      regError.textContent = "That name is already taken!";
      btn.disabled = false;
      return;
    }

    regError.textContent = "Creating your account...";

    const cred = await createUserWithEmailAndPassword(
      auth,
      email,
      pass
    );

    await updateProfile(cred.user, {
      displayName: name
    });

    await setDoc(usernameRef, {
      uid: cred.user.uid,
      name: name
    });

    regError.textContent = "";

  } catch (err) {
    console.error("Registration error:", err);

    regError.textContent = err.message.replace("Firebase: ", "");
    btn.disabled = false;
  }
}

// ==========================================
// LOGIN
// ==========================================

async function handleLogin() {
  const {
    signInWithEmailAndPassword,
    signOut
  } = firebaseFunctions;

  const name = document.getElementById("login-name").value.trim();
  const email = document.getElementById("login-email").value.trim();
  const pass = document.getElementById("login-pass").value;

  const btn = document.getElementById("login-submit");

  btn.disabled = true;
  loginError.textContent = "Logging in...";

  try {
    const cred = await signInWithEmailAndPassword(
      auth,
      email,
      pass
    );

    const accountName = cred.user.displayName || "";

    if (accountName.toLowerCase() !== name.toLowerCase()) {
      await signOut(auth);

      loginError.textContent =
        "Name does not match this account!";

      btn.disabled = false;
      return;
    }

    loginError.textContent = "";

  } catch (err) {
    console.error("Login error:", err);

    loginError.textContent =
      "Invalid name, email, or password!";

    btn.disabled = false;
  }
}

// ==========================================
// START
// ==========================================

startFirebase();
