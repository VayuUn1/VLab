
/* =========================================
   VLAB - GAME PUBLISHING SYSTEM
   Firebase Authentication + Firestore
========================================= */

const firebaseConfig = {
  apiKey: "AIzaSyBceBIsTrGK6BRr5um9Sxj1BIEAgdZnKJQ",
  authDomain: "vlab-75355.firebaseapp.com",
  projectId: "vlab-75355",
  storageBucket: "vlab-75355.firebasestorage.app",
  messagingSenderId: "942029676825",
  appId: "1:942029676825:web:77cf57b966caa2d6822588"
};

const postButton = document.getElementById("post-game-btn");
const overlay = document.getElementById("post-game-overlay");
const closeButton = document.getElementById("close-post-game");
const form = document.getElementById("post-game-form");

const titleInput = document.getElementById("game-title");
const descriptionInput = document.getElementById("game-description");
const gameFileInput = document.getElementById("game-file");
const coverInput = document.getElementById("game-cover");

const coverPreview = document.getElementById("cover-preview");
const statusText = document.getElementById("upload-status");
const submitButton = document.getElementById("submit-game-btn");

const gameGrid = document.getElementById("game-grid");
const emptyGames = document.getElementById("empty-games");

let auth = null;
let db = null;
let currentUser = null;
let firestore = null;
let unsubscribeGames = null;

/* =========================================
   STYLES FOR GAME CARDS AND GAME VIEWER
========================================= */

const style = document.createElement("style");

style.textContent = `
  #game-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill,minmax(230px,1fr));
    gap: 22px;
    width: 100%;
  }

  .vlab-game-card {
    background: white;
    border: 1px solid #eeeeee;
    border-radius: 18px;
    overflow: hidden;
    box-shadow: 0 5px 18px rgba(0,0,0,.06);
  }

  .vlab-game-cover {
    height: 145px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: linear-gradient(135deg,#3985ff,#8b5cf6);
    color: white;
    font-size: 35px;
    font-weight: bold;
  }

  .vlab-game-info {
    padding: 17px;
  }

  .vlab-game-info h3 {
    font-size: 21px;
    margin-bottom: 7px;
    overflow-wrap: anywhere;
  }

  .vlab-game-info p {
    color: #777;
    font-size: 14px;
    min-height: 35px;
    overflow-wrap: anywhere;
  }

  .vlab-play-button {
    width: 100%;
    border: 0;
    border-radius: 10px;
    padding: 12px;
    margin-top: 14px;
    background: #3985ff;
    color: white;
    font: inherit;
    font-weight: bold;
    cursor: pointer;
  }

  .vlab-viewer {
    position: fixed;
    inset: 0;
    z-index: 100000;
    background: #111;
    display: flex;
    flex-direction: column;
  }

  .vlab-viewer-header {
    height: 58px;
    padding: 0 15px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    background: white;
    color: #222;
    font-weight: bold;
  }

  .vlab-viewer-close {
    border: 0;
    border-radius: 8px;
    padding: 9px 15px;
    background: #222;
    color: white;
    font-size: 16px;
    cursor: pointer;
  }

  .vlab-viewer iframe {
    width: 100%;
    flex: 1;
    border: 0;
    background: white;
  }
`;

document.head.appendChild(style);

/* =========================================
   INITIALIZE FIREBASE
========================================= */

async function initializeVLAB() {
  try {
    const appModule = await import(
      "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js"
    );

    const authModule = await import(
      "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js"
    );

    const dbModule = await import(
      "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js"
    );

    const app = appModule.getApps().length
      ? appModule.getApp()
      : appModule.initializeApp(firebaseConfig);

    auth = authModule.getAuth(app);
    db = dbModule.getFirestore(app);

    firestore = {
      collection: dbModule.collection,
      addDoc: dbModule.addDoc,
      query: dbModule.query,
      orderBy: dbModule.orderBy,
      onSnapshot: dbModule.onSnapshot,
      serverTimestamp: dbModule.serverTimestamp
    };

    authModule.onAuthStateChanged(auth, user => {
      currentUser = user;
    });

    loadGames();

  } catch (error) {
    console.error("VLAB Firebase error:", error);
    showStatus("Firebase connection failed. Please refresh.");
  }
}

/* =========================================
   FORM OPEN / CLOSE
========================================= */

function openForm() {
  overlay.hidden = false;
  titleInput.focus();
}

function closeForm() {
  overlay.hidden = true;
}

postButton.addEventListener("click", openForm);
closeButton.addEventListener("click", closeForm);

overlay.addEventListener("click", event => {
  if (event.target === overlay) closeForm();
});

document.addEventListener("keydown", event => {
  if (event.key === "Escape") {
    closeForm();
  }
});

/* =========================================
   STATUS MESSAGE
========================================= */

function showStatus(message) {
  statusText.textContent = message;
}

/* =========================================
   COVER PREVIEW
========================================= */

let coverURL = null;

coverInput.addEventListener("change", () => {
  const file = coverInput.files[0];

  if (coverURL) {
    URL.revokeObjectURL(coverURL);
    coverURL = null;
  }

  if (!file) {
    coverPreview.src = "default-game-cover.jpg";
    return;
  }

  if (!["image/png", "image/jpeg", "image/webp"].includes(file.type)) {
    coverInput.value = "";
    showStatus("Choose a JPG, PNG, or WEBP image.");
    return;
  }

  coverURL = URL.createObjectURL(file);
  coverPreview.src = coverURL;
});

/* =========================================
   PUBLISH GAME
========================================= */

form.addEventListener("submit", async event => {
  event.preventDefault();

  if (!currentUser) {
    showStatus("Please log in before publishing a game.");
    return;
  }

  const title = titleInput.value.trim();
  const description = descriptionInput.value.trim();
  const gameFile = gameFileInput.files[0];

  if (!title || !gameFile) {
    showStatus("Please enter a title and select an HTML file.");
    return;
  }

  if (!gameFile.name.toLowerCase().endsWith(".html")) {
    showStatus("Your game must be an HTML file.");
    return;
  }

  // Keep a safety margin below Firestore's document limit.
  if (gameFile.size > 450000) {
    showStatus("This HTML file is too large. Maximum size: 450 KB.");
    return;
  }

  if (description.length > 300 || title.length > 60) {
    showStatus("Your title or description is too long.");
    return;
  }

  submitButton.disabled = true;
  submitButton.textContent = "PUBLISHING...";
  showStatus("Reading your game...");

  try {
    const html = await gameFile.text();

    if (!html.trim()) {
      throw new Error("The HTML file is empty.");
    }

    showStatus("Publishing your game...");

    await firestore.addDoc(
      firestore.collection(db, "games"),
      {
        title,
        description,
        html,
        ownerUid: currentUser.uid,
        ownerName: currentUser.displayName || "Player",
        createdAt: firestore.serverTimestamp()
      }
    );

    showStatus("GAME PUBLISHED SUCCESSFULLY!");

    form.reset();
    coverPreview.src = "default-game-cover.jpg";

    if (coverURL) {
      URL.revokeObjectURL(coverURL);
      coverURL = null;
    }

    setTimeout(() => {
      closeForm();
      showStatus("");
    }, 1200);

  } catch (error) {
    console.error("Publishing error:", error);

    if (error.code === "permission-denied") {
      showStatus("Permission denied. Please check Firestore Rules.");
    } else {
      showStatus("Publishing failed: " + error.message);
    }

  } finally {
    submitButton.disabled = false;
    submitButton.textContent = "PUBLISH GAME";
  }
});

/* =========================================
   LOAD PUBLIC GAME LIBRARY
========================================= */

function loadGames() {
  const gamesQuery = firestore.query(
    firestore.collection(db, "games"),
    firestore.orderBy("createdAt", "desc")
  );

  unsubscribeGames = firestore.onSnapshot(
    gamesQuery,
    snapshot => {
      gameGrid.replaceChildren();

      emptyGames.hidden = snapshot.size > 0;

      snapshot.forEach(documentSnapshot => {
        const game = documentSnapshot.data();

        const card = document.createElement("article");
        card.className = "vlab-game-card";

        const cover = document.createElement("div");
        cover.className = "vlab-game-cover";
        cover.textContent = "VLAB";

        const info = document.createElement("div");
        info.className = "vlab-game-info";

        const title = document.createElement("h3");
        title.textContent = game.title || "Untitled Game";

        const description = document.createElement("p");
        description.textContent =
          game.description || "No description provided.";

        const author = document.createElement("p");
        author.textContent = "By " + (game.ownerName || "Player");

        const playButton = document.createElement("button");
        playButton.className = "vlab-play-button";
        playButton.textContent = "PLAY GAME";

        playButton.addEventListener("click", () => {
          openGame(game.title, game.html);
        });

        info.append(title, description, author, playButton);
        card.append(cover, info);
        gameGrid.appendChild(card);
      });
    },
    error => {
      console.error("Game loading error:", error);
      emptyGames.hidden = false;
      emptyGames.textContent = "Could not load games. Please refresh.";
    }
  );
}

/* =========================================
   SANDBOXED GAME VIEWER
========================================= */

function openGame(title, html) {
  const viewer = document.createElement("div");
  viewer.className = "vlab-viewer";

  const header = document.createElement("div");
  header.className = "vlab-viewer-header";

  const name = document.createElement("span");
  name.textContent = title;

  const close = document.createElement("button");
  close.className = "vlab-viewer-close";
  close.textContent = "CLOSE";

  const frame = document.createElement("iframe");

  // Only self-contained games are supported in this first version.
  // The sandbox prevents access to VLAB's main page.
  frame.setAttribute("sandbox", "allow-scripts");

  const securityPolicy = `
    <meta http-equiv="Content-Security-Policy"
      content="default-src 'none';
      script-src 'unsafe-inline' blob:;
      style-src 'unsafe-inline';
      img-src data: blob:;
      media-src data: blob:;
      font-src data:;
      connect-src 'none';
      form-action 'none';
      base-uri 'none';">
  `;

  frame.srcdoc = securityPolicy + html;

  close.addEventListener("click", () => {
    frame.srcdoc = "";
    viewer.remove();
  });

  header.append(name, close);
  viewer.append(header, frame);
  document.body.appendChild(viewer);
}

/* =========================================
   START
========================================= */

initializeVLAB();
