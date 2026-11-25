
/* =========================================
   VLAB GAME HUB
   Publishing + Likes + Dislikes + Fullscreen
========================================= */

const firebaseConfig = {
  apiKey: "AIzaSyBceBIsTrGK6BRr5um9Sxj1BIEAgdZnKJQ",
  authDomain: "vlab-75355.firebaseapp.com",
  projectId: "vlab-75355",
  storageBucket: "vlab-75355.firebasestorage.app",
  messagingSenderId: "942029676825",
  appId: "1:942029676825:web:77cf57b966caa2d6822588"
};

// Form elements
const postGameButton = document.getElementById("post-game-btn");
const overlay = document.getElementById("post-game-overlay");
const closeButton = document.getElementById("close-post-game");
const uploadForm = document.getElementById("post-game-form");

const titleInput = document.getElementById("game-title");
const descriptionInput = document.getElementById("game-description");
const gameFileInput = document.getElementById("game-file");
const coverInput = document.getElementById("game-cover");

const coverPreview = document.getElementById("cover-preview");
const uploadStatus = document.getElementById("upload-status");
const submitButton = document.getElementById("submit-game-btn");

// Library elements
const gameGrid = document.getElementById("game-grid");
const emptyGames = document.getElementById("empty-games");

let auth;
let db;
let currentUser = null;
let previousCoverURL = null;
let firestore = null;

/* =========================================
   ADD PLAYER STYLES
========================================= */

const style = document.createElement("style");

style.textContent = `
  #game-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(230px, 1fr));
    gap: 20px;
  }

  .vlab-game-card {
    background: white;
    color: #222;
    border-radius: 16px;
    overflow: hidden;
    border: 1px solid #e8e8e8;
    box-shadow: 0 5px 18px rgba(0,0,0,.06);
  }

  .vlab-game-cover {
    height: 145px;
    background: linear-gradient(135deg,#3985ff,#8b5cf6);
    color: white;
    display: flex;
    justify-content: center;
    align-items: center;
    font-size: 32px;
    font-weight: bold;
    overflow: hidden;
  }

  .vlab-game-cover img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .vlab-game-info {
    padding: 16px;
  }

  .vlab-game-info h3 {
    font-size: 20px;
    overflow-wrap: anywhere;
    margin: 0 0 8px;
  }

  .vlab-game-info p {
    font-size: 14px;
    color: #777;
    overflow-wrap: anywhere;
  }

  .vlab-play-button {
    width: 100%;
    padding: 12px;
    margin-top: 12px;
    border: none;
    border-radius: 10px;
    background: #3985ff;
    color: white;
    font-weight: bold;
    font-size: 15px;
    cursor: pointer;
  }

  .vlab-vote-row {
    display: flex;
    gap: 8px;
    margin-top: 12px;
  }

  .vlab-vote-button {
    flex: 1;
    padding: 10px 5px;
    border: 1px solid #ddd;
    border-radius: 10px;
    background: white;
    color: #333;
    font-size: 14px;
    font-weight: bold;
    cursor: pointer;
  }

  .vlab-vote-button.liked {
    background: #e5f8eb;
    border-color: #27ae60;
    color: #168443;
  }

  .vlab-vote-button.disliked {
    background: #ffeded;
    border-color: #e05252;
    color: #c0392b;
  }

  .vlab-viewer {
    position: fixed;
    inset: 0;
    z-index: 999999;
    background: #111;
    display: flex;
    flex-direction: column;
  }

  .vlab-viewer-header {
    min-height: 58px;
    padding: 8px 14px;
    background: white;
    color: #222;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
  }

  .vlab-viewer-title {
    font-weight: bold;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .vlab-viewer-actions {
    display: flex;
    gap: 8px;
  }

  .vlab-viewer-actions button {
    border: none;
    border-radius: 8px;
    padding: 10px 13px;
    background: #222;
    color: white;
    font-size: 14px;
    font-weight: bold;
    cursor: pointer;
  }

  .vlab-viewer iframe {
    width: 100%;
    flex: 1;
    border: 0;
    background: white;
  }

  .vlab-vote-message {
    font-size: 12px;
    color: #777;
    margin-top: 7px;
  }

  @media (max-width: 500px) {
    .vlab-viewer-header {
      padding: 7px;
    }

    .vlab-viewer-actions button {
      padding: 9px;
      font-size: 12px;
    }
  }
`;

document.head.appendChild(style);

/* =========================================
   FIREBASE INITIALIZATION
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
      doc: dbModule.doc,
      addDoc: dbModule.addDoc,
      setDoc: dbModule.setDoc,
      deleteDoc: dbModule.deleteDoc,
      getDoc: dbModule.getDoc,
      onSnapshot: dbModule.onSnapshot,
      query: dbModule.query,
      orderBy: dbModule.orderBy,
      serverTimestamp: dbModule.serverTimestamp
    };

    authModule.onAuthStateChanged(auth, user => {
      currentUser = user;
      renderGames();
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

function openPostGameForm() {
  if (!overlay) return;

  overlay.hidden = false;

  if (titleInput) titleInput.focus();
}

function closePostGameForm() {
  if (!overlay) return;

  overlay.hidden = true;

  if (postGameButton) postGameButton.focus();
}

postGameButton?.addEventListener("click", openPostGameForm);
closeButton?.addEventListener("click", closePostGameForm);

overlay?.addEventListener("click", event => {
  if (event.target === overlay) {
    closePostGameForm();
  }
});

document.addEventListener("keydown", event => {
  if (event.key === "Escape" && overlay && !overlay.hidden) {
    closePostGameForm();
  }
});

function showStatus(message) {
  if (uploadStatus) uploadStatus.textContent = message;
}

/* =========================================
   COVER PREVIEW
========================================= */

if (coverInput && coverPreview) {
  coverInput.addEventListener("change", () => {
    const file = coverInput.files[0];

    if (previousCoverURL) {
      URL.revokeObjectURL(previousCoverURL);
      previousCoverURL = null;
    }

    if (!file) {
      coverPreview.src = "default-game-cover.jpg";
      return;
    }

    const allowedTypes = [
      "image/jpeg",
      "image/png",
      "image/webp"
    ];

    if (!allowedTypes.includes(file.type)) {
      coverInput.value = "";
      coverPreview.src = "default-game-cover.jpg";
      showStatus("Choose a JPG, PNG, or WEBP image.");
      return;
    }

    previousCoverURL = URL.createObjectURL(file);
    coverPreview.src = previousCoverURL;
    showStatus("");
  });
}

/* =========================================
   PUBLISH GAME
========================================= */

uploadForm?.addEventListener("submit", async event => {
  event.preventDefault();

  if (!currentUser) {
    showStatus("Please log in before publishing a game.");
    return;
  }

  const title = titleInput.value.trim();
  const description = descriptionInput.value.trim();
  const gameFile = gameFileInput.files[0];

  if (!title || !gameFile) {
    showStatus("Enter a title and choose an HTML file.");
    return;
  }

  if (!gameFile.name.toLowerCase().endsWith(".html")) {
    showStatus("Your game must be an HTML file.");
    return;
  }

  if (gameFile.size > 450000) {
    showStatus("Maximum HTML file size is 450 KB.");
    return;
  }

  if (title.length > 80 || description.length > 300) {
    showStatus("Your title or description is too long.");
    return;
  }

  submitButton.disabled = true;
  submitButton.textContent = "PUBLISHING...";

  try {
    showStatus("Reading your game...");

    const html = await gameFile.text();

    if (!html.trim()) {
      throw new Error("Your HTML file is empty.");
    }

    showStatus("Publishing game...");

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

    uploadForm.reset();
    coverPreview.src = "default-game-cover.jpg";

    if (previousCoverURL) {
      URL.revokeObjectURL(previousCoverURL);
      previousCoverURL = null;
    }

    setTimeout(() => {
      closePostGameForm();
      showStatus("");
    }, 1200);

  } catch (error) {
    console.error("VLAB publishing error:", error);

    if (error.code === "permission-denied") {
      showStatus("Permission denied. Check Firestore Rules.");
    } else {
      showStatus("Publishing failed: " + error.message);
    }

  } finally {
    submitButton.disabled = false;
    submitButton.textContent = "PUBLISH GAME";
  }
});

/* =========================================
   LOAD GAME LIBRARY
========================================= */

let games = [];
let voteListeners = {};

function loadGames() {
  const gamesQuery = firestore.query(
    firestore.collection(db, "games"),
    firestore.orderBy("createdAt", "desc")
  );

  firestore.onSnapshot(
    gamesQuery,
    snapshot => {
      games = snapshot.docs.map(item => ({
        id: item.id,
        ...item.data()
      }));

      renderGames();
    },
    error => {
      console.error("VLAB library error:", error);
      if (emptyGames) {
        emptyGames.hidden = false;
        emptyGames.textContent = "Could not load games. Please refresh.";
      }
    }
  );
}

/* =========================================
   RENDER GAME CARDS
========================================= */

function renderGames() {
  if (!gameGrid || !emptyGames || !firestore) return;

  gameGrid.replaceChildren();
  emptyGames.hidden = games.length > 0;

  if (games.length === 0) {
    emptyGames.textContent = "No games yet. Be the first to publish!";
  }

  games.forEach(game => {
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

    const voteRow = document.createElement("div");
    voteRow.className = "vlab-vote-row";

    const likeButton = document.createElement("button");
    likeButton.className = "vlab-vote-button";
    likeButton.textContent = "👍 0";

    const dislikeButton = document.createElement("button");
    dislikeButton.className = "vlab-vote-button";
    dislikeButton.textContent = "👎 0";

    const voteMessage = document.createElement("div");
    voteMessage.className = "vlab-vote-message";

    const voteRefs = {
      likeButton,
      dislikeButton,
      voteMessage
    };

    watchVotes(game.id, voteRefs);

    likeButton.addEventListener("click", () => {
      submitVote(game.id, 1, voteRefs);
    });

    dislikeButton.addEventListener("click", () => {
      submitVote(game.id, -1, voteRefs);
    });

    voteRow.append(likeButton, dislikeButton);

    info.append(
      title,
      description,
      author,
      playButton,
      voteRow,
      voteMessage
    );

    card.append(cover, info);
    gameGrid.appendChild(card);
  });
}

/* =========================================
   LIVE VOTE COUNTS
========================================= */

function watchVotes(gameId, elements) {
  const votesRef = firestore.collection(
    db,
    "games",
    gameId,
    "votes"
  );

  const unsubscribe = firestore.onSnapshot(
    votesRef,
    snapshot => {
      let likes = 0;
      let dislikes = 0;
      let myVote = 0;

      snapshot.forEach(voteDoc => {
        const vote = voteDoc.data().value;

        if (vote === 1) likes++;
        if (vote === -1) dislikes++;

        if (
          currentUser &&
          voteDoc.id === currentUser.uid
        ) {
          myVote = vote;
        }
      });

      elements.likeButton.textContent = "👍 " + likes;
      elements.dislikeButton.textContent = "👎 " + dislikes;

      elements.likeButton.classList.toggle(
        "liked",
        myVote === 1
      );

      elements.dislikeButton.classList.toggle(
        "disliked",
        myVote === -1
      );

      if (!currentUser) {
        elements.voteMessage.textContent =
          "Log in to vote.";
      } else {
        elements.voteMessage.textContent =
          myVote === 1
            ? "You liked this game."
            : myVote === -1
              ? "You disliked this game."
              : "You haven't voted yet.";
      }
    },
    error => {
      console.error("Vote loading error:", error);
      elements.voteMessage.textContent =
        "Could not load votes.";
    }
  );

  voteListeners[gameId] = unsubscribe;
}

/* =========================================
   SUBMIT OR CHANGE VOTE
========================================= */

async function submitVote(gameId, value, elements) {
  if (!currentUser) {
    elements.voteMessage.textContent =
      "Please log in before voting.";
    return;
  }

  elements.likeButton.disabled = true;
  elements.dislikeButton.disabled = true;

  try {
    const voteRef = firestore.doc(
      db,
      "games",
      gameId,
      "votes",
      currentUser.uid
    );

    const existingVote = await firestore.getDoc(voteRef);

    if (
      existingVote.exists() &&
      existingVote.data().value === value
    ) {
      await firestore.deleteDoc(voteRef);
    } else {
      await firestore.setDoc(voteRef, {
        value,
        updatedAt: firestore.serverTimestamp()
      });
    }

  } catch (error) {
    console.error("VLAB voting error:", error);

    elements.voteMessage.textContent =
      error.code === "permission-denied"
        ? "Voting permission denied. Check Firestore Rules."
        : "Could not save your vote.";
  }

  elements.likeButton.disabled = false;
  elements.dislikeButton.disabled = false;
}

/* =========================================
   GAME PLAYER + FULLSCREEN
========================================= */

function openGame(title, html) {
  const viewer = document.createElement("div");
  viewer.className = "vlab-viewer";

  const header = document.createElement("div");
  header.className = "vlab-viewer-header";

  const name = document.createElement("div");
  name.className = "vlab-viewer-title";
  name.textContent = title || "VLAB Game";

  const actions = document.createElement("div");
  actions.className = "vlab-viewer-actions";

  const fullscreenButton = document.createElement("button");
  fullscreenButton.textContent = "⛶ FULLSCREEN";

  const close = document.createElement("button");
  close.textContent = "✕ CLOSE";

  const frame = document.createElement("iframe");

  frame.setAttribute("sandbox", "allow-scripts");
  frame.setAttribute("allowfullscreen", "");

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

  fullscreenButton.addEventListener("click", async () => {
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
      } else {
        await frame.requestFullscreen();
      }
    } catch (error) {
      console.error("Fullscreen error:", error);
      fullscreenButton.textContent = "Fullscreen unavailable";
    }
  });

  close.addEventListener("click", async () => {
    if (document.fullscreenElement) {
      await document.exitFullscreen().catch(() => {});
    }

    frame.srcdoc = "";
    viewer.remove();
  });

  actions.append(fullscreenButton, close);
  header.append(name, actions);
  viewer.append(header, frame);

  document.body.appendChild(viewer);
}

/* =========================================
   START VLAB
========================================= */

initializeVLAB();
