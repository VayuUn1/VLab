/* =========================================
   VLAB GAME HUB 3.0
   Multi-file games + Code Editor
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

const MAX_GAME_BYTES = 450000;

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

/* Creation options */

const uploadOptionButton = document.getElementById("upload-option-btn");
const createOptionButton = document.getElementById("create-option-btn");

const uploadFilesSection = document.getElementById("upload-files-section");
const createFilesSection = document.getElementById("create-files-section");

const gameDetailsSection = document.getElementById("game-details-section");
const codeEditorSection = document.getElementById("code-editor-section");

const openEditorButton = document.getElementById("open-editor-btn");
const createdFilesSummary = document.getElementById("created-files-summary");

const editorFileTabs = document.getElementById("editor-file-tabs");
const addEditorFileButton = document.getElementById("add-editor-file-btn");
const fileTypeMenu = document.getElementById("file-type-menu");

const editorFilename = document.getElementById("editor-filename");
const editorCode = document.getElementById("editor-code");
const editorStatus = document.getElementById("editor-status");

const saveEditorFileButton = document.getElementById("save-editor-file-btn");
const confirmEditorButton = document.getElementById("confirm-editor-btn");
const cancelEditorButton = document.getElementById("cancel-editor-btn");

/* =========================================
   FIREBASE VARIABLES
========================================= */

let auth;
let db;
let currentUser = null;
let authReady = false;
let firestore = null;

let games = [];

let voteListeners = {};
let playListeners = {};

let gameLikes = {};
let gameDislikes = {};
let gamePlayerCounts = {};

/* =========================================
   FILE EDITOR VARIABLES
========================================= */

let creationMode = "upload";

let createdFiles = {
  "index.html": ""
};

let activeFileName = "index.html";

let savedEditorFiles = {};

/* =========================================
   ADD VLAB STYLES
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
   SEARCH AND SORT CONTROLS
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

  const options = [
    { value: "newest", label: "Newest" },
    { value: "older", label: "Older" },
    { value: "most-liked", label: "Most liked" },
    { value: "lowest-liked", label: "Lowest likes" }
  ];

  options.forEach(option => {
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
   STATUS MESSAGE
========================================= */

function showStatus(message) {
  if (uploadStatus) {
    uploadStatus.textContent = message;
  }
}

function showEditorStatus(message) {
  if (editorStatus) {
    editorStatus.textContent = message;
  }
}

/* =========================================
   OPEN / CLOSE POST WINDOW
========================================= */

function openPostGameForm() {
  if (!currentUser) {
    showStatus("Please log in before publishing a game.");
    return;
  }

  if (!overlay) return;

  overlay.hidden = false;
}

function closePostGameForm() {
  if (!overlay) return;

  overlay.hidden = true;

  if (postGameButton) {
    postGameButton.focus();
  }
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
}/* =========================================
   COVER IMAGE PREVIEW
========================================= */

let previousCoverURL = null;

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
   CREATION METHOD SWITCHING
========================================= */

function setCreationMode(mode) {
  creationMode = mode;

  const isUpload = mode === "upload";

  if (uploadFilesSection) {
    uploadFilesSection.hidden = !isUpload;
  }

  if (createFilesSection) {
    createFilesSection.hidden = isUpload;
  }

  uploadOptionButton?.classList.toggle("active", isUpload);
  createOptionButton?.classList.toggle("active", !isUpload);

  if (gameFileInput) {
    gameFileInput.required = isUpload;
  }

  showStatus("");
}

uploadOptionButton?.addEventListener("click", () => {
  setCreationMode("upload");
});

createOptionButton?.addEventListener("click", () => {
  setCreationMode("create");
});

/* =========================================
   CODE EDITOR
========================================= */

function openCodeEditor() {
  if (!gameDetailsSection || !codeEditorSection) return;

  gameDetailsSection.hidden = true;
  codeEditorSection.hidden = false;

  if (!createdFiles["index.html"]) {
    createdFiles["index.html"] = "";
  }

  activeFileName = activeFileName in createdFiles
    ? activeFileName
    : "index.html";

  loadEditorFile(activeFileName);
  renderEditorTabs();
}

function closeCodeEditor() {
  if (!gameDetailsSection || !codeEditorSection) return;

  codeEditorSection.hidden = true;
  gameDetailsSection.hidden = false;

  if (fileTypeMenu) {
    fileTypeMenu.hidden = true;
  }
}

openEditorButton?.addEventListener("click", openCodeEditor);

/* Load a file into the editor */

function loadEditorFile(filename) {
  if (!(filename in createdFiles)) return;

  activeFileName = filename;

  if (editorFilename) {
    editorFilename.value = filename;
  }

  if (editorCode) {
    editorCode.value = createdFiles[filename];
  }

  showEditorStatus("Editing " + filename);
  renderEditorTabs();
}

/* Check filename */

function validFilename(filename) {
  return /^[A-Za-z0-9_-]+(?:\.[A-Za-z0-9]+)$/.test(filename);
}

function correctExtension(filename) {
  const extension = filename.split(".").pop().toLowerCase();

  return ["html", "css", "js"].includes(extension);
}

/* Save the currently edited file */

function saveEditorFile() {
  if (!editorFilename || !editorCode) return false;

  const newName = editorFilename.value.trim();

  if (!validFilename(newName) || !correctExtension(newName)) {
    showEditorStatus(
      "Use a valid filename ending in .html, .css, or .js."
    );
    return false;
  }

  if (
    newName !== activeFileName &&
    Object.prototype.hasOwnProperty.call(createdFiles, newName)
  ) {
    showEditorStatus("A file with that name already exists.");
    return false;
  }

  if (
    activeFileName === "index.html" &&
    newName !== "index.html"
  ) {
    showEditorStatus("The main file must remain index.html.");
    return false;
  }

  const content = editorCode.value;

  if (newName !== activeFileName) {
    delete createdFiles[activeFileName];
  }

  createdFiles[newName] = content;
  activeFileName = newName;

  renderEditorTabs();
  updateCreatedFilesSummary();

  showEditorStatus("Saved " + newName + "!");
  return true;
}

saveEditorFileButton?.addEventListener("click", saveEditorFile);

/* File tabs */

function renderEditorTabs() {
  if (!editorFileTabs) return;

  editorFileTabs.replaceChildren();

  Object.keys(createdFiles).forEach(filename => {
    const tab = document.createElement("button");

    tab.type = "button";
    tab.className = "editor-file-tab";
    tab.textContent = filename;

    if (filename === activeFileName) {
      tab.classList.add("active");
    }

    tab.addEventListener("click", () => {
      if (filename === activeFileName) return;

      if (!saveEditorFile()) return;

      loadEditorFile(filename);
    });

    editorFileTabs.appendChild(tab);
  });
}

/* Add file menu */

addEditorFileButton?.addEventListener("click", () => {
  if (!fileTypeMenu) return;

  fileTypeMenu.hidden = !fileTypeMenu.hidden;
});

function createNewFile(type) {
  const defaults = {
    html: "page",
    css: "style",
    js: "script"
  };

  const extension = type.toLowerCase();

  if (!["html", "css", "js"].includes(extension)) return;

  let filename = defaults[extension] + "." + extension;
  let counter = 2;

  while (filename in createdFiles) {
    filename = defaults[extension] + counter + "." + extension;
    counter++;
  }

  if (!saveEditorFile()) return;

  createdFiles[filename] = "";
  loadEditorFile(filename);

  if (fileTypeMenu) {
    fileTypeMenu.hidden = true;
  }

  showEditorStatus("Created " + filename + "!");
}

fileTypeMenu?.querySelectorAll("[data-file-type]").forEach(button => {
  button.addEventListener("click", () => {
    createNewFile(button.dataset.fileType);
  });
});

/* Confirm editor */

confirmEditorButton?.addEventListener("click", () => {
  if (!saveEditorFile()) return;

  if (!createdFiles["index.html"]?.trim()) {
    showEditorStatus("Your index.html file cannot be empty.");
    return;
  }

  closeCodeEditor();
  updateCreatedFilesSummary();

  showStatus("Files confirmed! You can now publish your game.");
});

/* Cancel editor */

cancelEditorButton?.addEventListener("click", () => {
  closeCodeEditor();
});

/* Summary */

function updateCreatedFilesSummary() {
  if (!createdFilesSummary) return;

  const names = Object.keys(createdFiles);

  createdFilesSummary.textContent =
    names.length + " file(s): " + names.join(", ");
}

/* =========================================
   READ UPLOADED FILES
========================================= */

async function readUploadedFiles() {
  const selectedFiles = Array.from(gameFileInput.files || []);

  if (selectedFiles.length === 0) {
    throw new Error("Choose your game files first.");
  }

  const files = {};

  for (const file of selectedFiles) {
    const filename = file.name;

    if (!validFilename(filename)) {
      throw new Error("Invalid filename: " + filename);
    }

    if (!correctExtension(filename)) {
      throw new Error("Only HTML, CSS, and JS files are supported.");
    }

    if (Object.prototype.hasOwnProperty.call(files, filename)) {
      throw new Error("Duplicate filename: " + filename);
    }

    files[filename] = await file.text();
  }

  if (!files["index.html"]) {
    throw new Error("Your main HTML file must be named index.html.");
  }

  return files;
}

/* =========================================
   CHECK TOTAL GAME SIZE
========================================= */

function getTotalFileSize(files) {
  const encoder = new TextEncoder();
  let total = 0;

  for (const [filename, content] of Object.entries(files)) {
    total += encoder.encode(filename).length;
    total += encoder.encode(content).length;
  }

  return total;
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

  if (codeEditorSection && !codeEditorSection.hidden) {
    showStatus("Please confirm your editor files first.");
    return;
  }

  const title = titleInput.value.trim();
  const description = descriptionInput.value.trim();

  if (!title) {
    showStatus("Enter a game title.");
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

  if (description.length > 300) {
    showStatus("Your description is too long.");
    return;
  }

  submitButton.disabled = true;
  submitButton.textContent = "PUBLISHING...";

  try {
    showStatus("Preparing game files...");

    let files;

    if (creationMode === "upload") {
      files = await readUploadedFiles();
    } else {
      files = { ...createdFiles };

      if (!files["index.html"]?.trim()) {
        throw new Error("Your index.html file is missing or empty.");
      }
    }

    const totalSize = getTotalFileSize(files);

    if (totalSize > MAX_GAME_BYTES) {
      throw new Error(
        "Your game files are too large. Maximum total size is 450 KB."
      );
    }

    const html = files["index.html"];

    showStatus("Publishing game...");

    await firestore.addDoc(
      firestore.collection(db, "games"),
      {
        title,
        description,
        html,
        files,
        ownerUid: currentUser.uid,
        ownerName: currentUser.displayName || "Player",
        createdAt: firestore.serverTimestamp()
      }
    );

    showStatus("GAME PUBLISHED SUCCESSFULLY!");

    resetPostForm();

    setTimeout(() => {
      closePostGameForm();
      showStatus("");
    }, 1200);

  } catch (error) {
    console.error("VLAB publishing error:", error);

    if (error.code === "permission-denied") {
      showStatus(
        "Permission denied. We need to update Firestore Rules."
      );
    } else {
      showStatus("Publishing failed: " + error.message);
    }

  } finally {
    submitButton.disabled = false;
    submitButton.textContent = "PUBLISH GAME";
  }
});

/* =========================================
   RESET POST FORM
========================================= */

function resetPostForm() {
  uploadForm.reset();

  createdFiles = {
    "index.html": ""
  };

  activeFileName = "index.html";
  creationMode = "upload";

  setCreationMode("upload");

  if (gameDetailsSection) {
    gameDetailsSection.hidden = false;
  }

  if (codeEditorSection) {
    codeEditorSection.hidden = true;
  }

  if (coverPreview) {
    coverPreview.src = "default-game-cover.jpg";
  }

  if (previousCoverURL) {
    URL.revokeObjectURL(previousCoverURL);
    previousCoverURL = null;
  }

  if (editorFileTabs) {
    editorFileTabs.replaceChildren();
  }

  if (editorCode) {
    editorCode.value = "";
  }

  updateCreatedFilesSummary();
  showEditorStatus("");
}

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
    info.className = "vlab-game-info";    const title = document.createElement("h3");
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

          if (!existingPlay.exists()) {
            await firestore.setDoc(playerRef, {
              createdAt: firestore.serverTimestamp()
            });
          }

        } catch (error) {
          console.error("Player count error:", error);
        }
      }

      const files = game.files || null;

      openGame(game.title, files, game.html);
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

      elements.likeButton.classList.toggle("liked", myVote === 1);
      elements.dislikeButton.classList.toggle("disliked", myVote === -1);

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

      applyFiltersAndSort();
    },
    error => {
      console.error("Vote loading error:", error);
      elements.voteMessage.textContent = "Could not load votes.";
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
   PREPARE MULTI-FILE GAME HTML
========================================= */

function escapeClosingTag(content, tagName) {
  const expression = new RegExp("</" + tagName, "gi");
  return content.replace(expression, "<\\/" + tagName);
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function prepareGameHTML(files, legacyHTML) {
  if (!files || typeof files !== "object") {
    return legacyHTML || "";
  }

  let html = files["index.html"] || legacyHTML || "";

  if (!html.trim()) {
    return "";
  }

  const cssFiles = [];
  const jsFiles = [];

  Object.entries(files).forEach(([filename, content]) => {
    const extension = filename.split(".").pop().toLowerCase();

    if (extension === "css") {
      cssFiles.push({ filename, content });
    }

    if (extension === "js") {
      jsFiles.push({ filename, content });
    }
  });

  /* Remove local CSS links because CSS is embedded below. */

  cssFiles.forEach(file => {
    const escapedName = escapeRegExp(file.filename);

    const linkPattern = new RegExp(
      "<link\\b(?=[^>]*\\bhref\\s*=\\s*['\"](?:\\.\\/)?"
      + escapedName
      + "['\"])[^>]*>",
      "gi"
    );

    html = html.replace(linkPattern, "");
  });

  /* Remove local JavaScript script tags. */

  jsFiles.forEach(file => {
    const escapedName = escapeRegExp(file.filename);

    const scriptPattern = new RegExp(
      "<script\\b(?=[^>]*\\bsrc\\s*=\\s*['\"](?:\\.\\/)?"
      + escapedName
      + "['\"])[^>]*>\\s*<\\/script\\s*>",
      "gi"
    );

    html = html.replace(scriptPattern, "");
  });

  /* Add all CSS files. */

  if (cssFiles.length > 0) {
    const css = cssFiles
      .map(file => escapeClosingTag(file.content, "style"))
      .join("\n");

    const styleTag = "<style>\n" + css + "\n</style>";

    if (/<\/head\s*>/i.test(html)) {
      html = html.replace(/<\/head\s*>/i, styleTag + "\n</head>");
    } else {
      html = styleTag + html;
    }
  }

  /* Add all JavaScript files. */

  if (jsFiles.length > 0) {
    const js = jsFiles
      .map(file => escapeClosingTag(file.content, "script"))
      .join("\n");

    const scriptTag = "<script>\n" + js + "\n</script>";

    if (/<\/body\s*>/i.test(html)) {
      html = html.replace(/<\/body\s*>/i, scriptTag + "\n</body>");
    } else {
      html += scriptTag;
    }
  }

  return html;
}

/* =========================================
   GAME PLAYER + FULLSCREEN
========================================= */

function openGame(title, files, legacyHTML) {
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
  fullscreenButton.type = "button";
  fullscreenButton.textContent = "⛶ FULLSCREEN";

  const close = document.createElement("button");
  close.type = "button";
  close.textContent = "✕ CLOSE";

  const frame = document.createElement("iframe");

  // Keep games isolated from the main VLAB website.
  // Do NOT add allow-same-origin to this sandbox.
  frame.setAttribute("sandbox", "allow-scripts");
  frame.setAttribute("allowfullscreen", "");

  const securityPolicy = `
    <meta http-equiv="Content-Security-Policy"
      content="default-src 'none';
      script-src 'unsafe-inline' blob:;
      style-src 'unsafe-inline' blob:;
      img-src data: blob:;
      media-src data: blob:;
      font-src data:;
      connect-src 'none';
      form-action 'none';
      base-uri 'none';">
  `;

  // Sandboxed frames have an opaque origin. Accessing the browser's real
  // localStorage can therefore throw a SecurityError. This small in-memory
  // replacement lets games use localStorage during the current play session
  // without granting them access to VLAB's actual website storage.
  const storageCompatibility = `
    <script>
    (() => {
      let storageAvailable = false;

      try {
        window.localStorage.getItem("__vlab_test__");
        storageAvailable = true;
      } catch (error) {
        storageAvailable = false;
      }

      if (!storageAvailable) {
        const values = Object.create(null);

        const temporaryStorage = {
          get length() {
            return Object.keys(values).length;
          },
          key(index) {
            return Object.keys(values)[index] ?? null;
          },
          getItem(key) {
            key = String(key);
            return Object.prototype.hasOwnProperty.call(values, key)
              ? values[key]
              : null;
          },
          setItem(key, value) {
            values[String(key)] = String(value);
          },
          removeItem(key) {
            delete values[String(key)];
          },
          clear() {
            Object.keys(values).forEach(key => delete values[key]);
          }
        };

        try {
          Object.defineProperty(window, "localStorage", {
            configurable: true,
            value: temporaryStorage
          });
        } catch (error) {
          console.error("VLAB temporary storage setup failed:", error);
        }
      }
    })();
    <\/script>
  `;

  const gameHTML = prepareGameHTML(files, legacyHTML);
  frame.srcdoc = securityPolicy + storageCompatibility + gameHTML;

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

updateCreatedFilesSummary();
initializeVLAB();
