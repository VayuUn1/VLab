
/* =========================================
   VLAB GAME HUB 2.0
   Search + Sorting + Player Counts
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

/* =========================================
   PAGE ELEMENTS
========================================= */

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

const gameGrid = document.getElementById("game-grid");
const emptyGames = document.getElementById("empty-games");

/* =========================================
   FIREBASE VARIABLES
========================================= */

let auth;
let db;
let currentUser = null;
let authReady = false;
let previousCoverURL = null;
let firestore = null;

let games = [];

let voteListeners = {};
let playListeners = {};

let gameLikes = {};
let gameDislikes = {};
let gamePlayerCounts = {};

/* =========================================
   ADD VLAB 2.0 STYLES
========================================= */

const style = document.createElement("style");

style.textContent = `
  #game-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(230px, 1fr));
    gap: 20px;
  }

  .vlab-toolbar {
    display: flex;
    gap: 10px;
    margin: 15px 0 20px;
    align-items: stretch;
  }

  .vlab-search {
    flex: 1;
    min-width: 0;
    padding: 12px 14px;
    border: 1px solid #ddd;
    border-radius: 10px;
    font-size: 15px;
    outline: none;
  }

  .vlab-search:focus {
    border-color: #3985ff;
  }

  .vlab-sort-wrap {
    position: relative;
  }

  .vlab-sort-button {
    height: 100%;
    min-width: 48px;
    padding: 10px 14px;
    border: none;
    border-radius: 10px;
    background: #222;
    color: white;
    font-size: 23px;
    cursor: pointer;
  }

  .vlab-sort-menu {
    position: absolute;
    top: calc(100% + 8px);
    right: 0;
    z-index: 1000;
    width: 175px;
    padding: 6px;
    background: white;
    border: 1px solid #ddd;
    border-radius: 12px;
    box-shadow: 0 8px 25px rgba(0,0,0,.15);
  }

  .vlab-sort-menu button {
    width: 100%;
    padding: 11px;
    border: none;
    border-radius: 8px;
    background: white;
    color: #222;
    text-align: left;
    font-size: 14px;
    cursor: pointer;
  }

  .vlab-sort-menu button:hover,
  .vlab-sort-menu button.active {
    background: #eaf2ff;
    color: #2672df;
  }

  .vlab-game-card {
    background: white;
    color: #222;
    border-radius: 16px;
    overflow: hidden;
    border: 1px solid #e8e8e8;
    box-shadow: 0 5px 18px rgba(0,0,0,.06);
    cursor: pointer;
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

  .vlab-game-date,
  .vlab-player-count {
    font-size: 12px !important;
    color: #888 !important;
    margin: 6px 0;
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

  .vlab-vote-message {
    font-size: 12px;
    color: #777;
    margin-top: 7px;
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

  @media (max-width: 500px) {
    .vlab-viewer-header {
      padding: 7px;
    }

    .vlab-viewer-actions button {
      padding: 9px;
      font-size: 12px;
    }

    .vlab-toolbar {
      gap: 7px;
    }
  }
`;

document.head.appendChild(style);

/* =========================================
   CREATE SEARCH AND SORT CONTROLS
========================================= */

let searchInput = null;
let sortButton = null;
let sortMenu = null;

let currentSort = "newest";

function createToolbar() {
  if (!gameGrid || document.getElementById("vlab-toolbar")) {
    return;
  }

  const toolbar = document.createElement("div");
  toolbar.className = "vlab-toolbar";
  toolbar.id = "vlab-toolbar";

  searchInput = document.createElement("input");
  searchInput.className = "vlab-search";
  searchInput.type = "search";
  searchInput.placeholder = "🔎 Search games...";
  searchInput.setAttribute("aria-label", "Search games");

  searchInput.addEventListener("input", applyFiltersAndSort);

  const sortWrap = document.createElement("div");
  sortWrap.className = "vlab-sort-wrap";

  sortButton = document.createElement("button");
  sortButton.className = "vlab-sort-button";
  sortButton.textContent = "☰";
  sortButton.type = "button";
  sortButton.setAttribute("aria-label", "Sort games");
  sortButton.setAttribute("aria-expanded", "false");

  sortMenu = document.createElement("div");
  sortMenu.className = "vlab-sort-menu";
  sortMenu.hidden = true;

  const sortOptions = [
    { value: "newest", label: "Newest" },
    { value: "older", label: "Older" },
    { value: "most-liked", label: "Most liked" },
    { value: "lowest-liked", label: "Lowest likes" }
  ];

  sortOptions.forEach(option => {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = option.label;

    button.addEventListener("click", () => {
      currentSort = option.value;

      sortMenu.querySelectorAll("button").forEach(item => {
        item.classList.remove("active");
      });

      button.classList.add("active");
      sortMenu.hidden = true;
      sortButton.setAttribute("aria-expanded", "false");

      applyFiltersAndSort();
    });

    if (option.value === currentSort) {
      button.classList.add("active");
    }

    sortMenu.appendChild(button);
  });

  sortButton.addEventListener("click", () => {
    sortMenu.hidden = !sortMenu.hidden;
    sortButton.setAttribute(
      "aria-expanded",
      String(!sortMenu.hidden)
    );
  });

  document.addEventListener("click", event => {
    if (!sortWrap.contains(event.target)) {
      sortMenu.hidden = true;
      sortButton.setAttribute("aria-expanded", "false");
    }
  });

  sortWrap.append(sortButton, sortMenu);
  toolbar.append(searchInput, sortWrap);

  gameGrid.parentNode.insertBefore(toolbar, gameGrid);
}

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

    createToolbar();

    authModule.onAuthStateChanged(auth, user => {
      currentUser = user;
      authReady = true;
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
  if (!currentUser) {
    showStatus("Please log in before publishing a game.");
    return;
  }

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
  if (uploadStatus) {
    uploadStatus.textContent = message;
  }
}

/* =========================================
   TITLE VALIDATION
========================================= */

if (titleInput) {
  titleInput.maxLength = 80;
  titleInput.setAttribute("pattern", "[A-Za-z0-9 ]+");
  titleInput.setAttribute(
    "title",
    "Use only English letters, numbers, and spaces."
  );
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

  if (!authReady || !currentUser) {
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

  if (!/^[A-Za-z0-9 ]+$/.test(title)) {
    showStatus(
      "Game titles can only contain letters, numbers, and spaces."
    );
    return;
  }

  if (title.length > 80) {
    showStatus("Your game title is too long.");
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

  if (description.length > 300) {
    showStatus("Your description is too long.");
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

    if (coverPreview) {
      coverPreview.src = "default-game-cover.jpg";
    }

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
        emptyGames.textContent =
          "Could not load games. Please refresh.";
      }
    }
  );
}

/* =========================================
   DATE FORMAT
========================================= */

function formatGameDate(timestamp) {
  if (!timestamp || typeof timestamp.toDate !== "function") {
    return "Date unavailable";
  }

  return timestamp.toDate().toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric"
  });
}

function getGameTime(game) {
  if (game.createdAt && typeof game.createdAt.toMillis === "function") {
    return game.createdAt.toMillis();
  }

  return 0;
}

/* =========================================
   RENDER GAME CARDS
========================================= */

function renderGames() {
  if (!gameGrid || !emptyGames || !firestore) return;

  // Stop old listeners before rebuilding cards.
  Object.values(voteListeners).forEach(unsubscribe => unsubscribe());
  Object.values(playListeners).forEach(unsubscribe => unsubscribe());

  voteListeners = {};
  playListeners = {};

  gameGrid.replaceChildren();

  if (games.length === 0) {
    emptyGames.hidden = false;
    emptyGames.textContent =
      "No games yet. Be the first to publish!";
    return;
  }

  emptyGames.hidden = true;

  games.forEach(game => {
    const card = document.createElement("article");
    card.className = "vlab-game-card";
    card.dataset.gameId = game.id;

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

    const date = document.createElement("p");
    date.className = "vlab-game-date";
    date.textContent = "📅 " + formatGameDate(game.createdAt);

    const playerCount = document.createElement("p");
    playerCount.className = "vlab-player-count";
    playerCount.textContent = "👥 Players: 0";

    const playButton = document.createElement("button");
    playButton.className = "vlab-play-button";
    playButton.textContent = "PLAY GAME";
    playButton.type = "button";

    const launchGame = async () => {
      if (!authReady) {
        showStatus("Please wait a moment and try again.");
        return;
      }

      // Guests can play, but do not count.
      if (currentUser) {
        try {
          const playerRef = firestore.doc(
            db,
            "games",
            game.id,
            "plays",
            currentUser.uid
          );

          const existingPlay = await firestore.getDoc(playerRef);

          // Create only once for each registered account.
          if (!existingPlay.exists()) {
            await firestore.setDoc(playerRef, {
              createdAt: firestore.serverTimestamp()
            });
          }

        } catch (error) {
          console.error("Player count error:", error);
        }
      }

      openGame(game.title, game.html);
    };

    playButton.addEventListener("click", event => {
      event.stopPropagation();
      launchGame();
    });

    const voteRow = document.createElement("div");
    voteRow.className = "vlab-vote-row";

    const likeButton = document.createElement("button");
    likeButton.className = "vlab-vote-button";
    likeButton.textContent = "👍 0";
    likeButton.type = "button";

    const dislikeButton = document.createElement("button");
    dislikeButton.className = "vlab-vote-button";
    dislikeButton.textContent = "👎 0";
    dislikeButton.type = "button";

    const voteMessage = document.createElement("div");
    voteMessage.className = "vlab-vote-message";

    const voteRefs = {
      likeButton,
      dislikeButton,
      voteMessage,
      card
    };

    watchVotes(game.id, voteRefs);
    watchPlayerCount(game.id, playerCount);

    likeButton.addEventListener("click", event => {
      event.stopPropagation();
      submitVote(game.id, 1, voteRefs);
    });

    dislikeButton.addEventListener("click", event => {
      event.stopPropagation();
      submitVote(game.id, -1, voteRefs);
    });

    voteRow.append(likeButton, dislikeButton);

    info.append(
      title,
      description,
      author,
      date,
      playerCount,
      playButton,
      voteRow,
      voteMessage
    );

    card.append(cover, info);

    // Clicking the card also launches the game.
    card.addEventListener("click", launchGame);

    gameGrid.appendChild(card);
  });

  applyFiltersAndSort();
}

/* =========================================
   SEARCH + SORTING
========================================= */

function applyFiltersAndSort() {
  if (!gameGrid) return;

  const searchText = searchInput
    ? searchInput.value.trim().toLowerCase()
    : "";

  const cards = Array.from(
    gameGrid.querySelectorAll(".vlab-game-card")
  );

  const filteredCards = cards.filter(card => {
    const game = games.find(
      item => item.id === card.dataset.gameId
    );

    if (!game) return false;

    const title = (game.title || "").toLowerCase();
    const matches = title.includes(searchText);

    card.hidden = !matches;
    return matches;
  });

  filteredCards.sort((a, b) => {
    const gameA = games.find(item => item.id === a.dataset.gameId);
    const gameB = games.find(item => item.id === b.dataset.gameId);

    if (!gameA || !gameB) return 0;

    if (currentSort === "newest") {
      return getGameTime(gameB) - getGameTime(gameA);
    }

    if (currentSort === "older") {
      return getGameTime(gameA) - getGameTime(gameB);
    }

    if (currentSort === "most-liked") {
      return (gameLikes[gameB.id] || 0) -
             (gameLikes[gameA.id] || 0);
    }

    if (currentSort === "lowest-liked") {
      return (gameLikes[gameA.id] || 0) -
             (gameLikes[gameB.id] || 0);
    }

    return 0;
  });

  filteredCards.forEach(card => {
    gameGrid.appendChild(card);
  });

  if (emptyGames && games.length > 0) {
    const hasResults = filteredCards.length > 0;

    emptyGames.hidden = hasResults;
    emptyGames.textContent = hasResults
      ? ""
      : "No games found. Try another search.";
  }
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

      gameLikes[gameId] = likes;
      gameDislikes[gameId] = dislikes;

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
        elements.voteMessage.textContent = "Log in to vote.";
      } else {
        elements.voteMessage.textContent =
          myVote === 1
            ? "You liked this game."
            : myVote === -1
              ? "You disliked this game."
              : "You haven't voted yet.";
      }

      // Update the order when likes change.
      applyFiltersAndSort();
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
   LIVE PLAYER COUNTS
========================================= */

function watchPlayerCount(gameId, element) {
  const playsRef = firestore.collection(
    db,
    "games",
    gameId,
    "plays"
  );

  const unsubscribe = firestore.onSnapshot(
    playsRef,
    snapshot => {
      const count = snapshot.size;

      gamePlayerCounts[gameId] = count;
      element.textContent = "👥 Players: " + count;
    },
    error => {
      console.error("Player count loading error:", error);
      element.textContent = "👥 Players: unavailable";
    }
  );

  playListeners[gameId] = unsubscribe;
}

/* =========================================
   SUBMIT OR CHANGE VOTE
========================================= */

async function submitVote(gameId, value, elements) {
  if (!authReady || !currentUser) {
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

  } finally {
    elements.likeButton.disabled = false;
    elements.dislikeButton.disabled = false;
  }
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
