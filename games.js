
/* =================================
   VLAB GAME HUB
   Upload Form Interface
================================= */

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

let previousCoverURL = null;


/* =================================
   OPEN FORM
================================= */

function openPostGameForm() {
  if (!overlay) return;

  overlay.hidden = false;

  if (titleInput) {
    titleInput.focus();
  }
}


/* =================================
   CLOSE FORM
================================= */

function closePostGameForm() {
  if (!overlay) return;

  overlay.hidden = true;

  if (postGameButton) {
    postGameButton.focus();
  }
}


/* =================================
   BUTTON EVENTS
================================= */

if (postGameButton) {
  postGameButton.addEventListener("click", openPostGameForm);
}

if (closeButton) {
  closeButton.addEventListener("click", closePostGameForm);
}


/* =================================
   CLOSE WHEN TAPPING OUTSIDE
================================= */

if (overlay) {
  overlay.addEventListener("click", function(event) {
    if (event.target === overlay) {
      closePostGameForm();
    }
  });
}


/* =================================
   CLOSE WITH ESCAPE KEY
================================= */

document.addEventListener("keydown", function(event) {
  if (event.key === "Escape" && overlay && !overlay.hidden) {
    closePostGameForm();
  }
});


/* =================================
   COVER IMAGE PREVIEW
================================= */

if (coverInput && coverPreview) {
  coverInput.addEventListener("change", function() {

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

      if (uploadStatus) {
        uploadStatus.textContent =
          "Please choose a JPG, PNG, or WEBP image.";
      }

      return;
    }

    previousCoverURL = URL.createObjectURL(file);
    coverPreview.src = previousCoverURL;

    if (uploadStatus) {
      uploadStatus.textContent = "";
    }
  });
}


/* =================================
   FORM VALIDATION
================================= */

if (uploadForm) {
  uploadForm.addEventListener("submit", function(event) {

    event.preventDefault();

    if (uploadStatus) {
      uploadStatus.textContent = "";
    }

    const title = titleInput.value.trim();
    const gameFile = gameFileInput.files[0];

    if (!title) {
      uploadStatus.textContent = "Please enter a game title.";
      titleInput.focus();
      return;
    }

    if (!gameFile) {
      uploadStatus.textContent = "Please select your HTML game file.";
      gameFileInput.focus();
      return;
    }

    const fileName = gameFile.name.toLowerCase();

    if (!fileName.endsWith(".html")) {
      uploadStatus.textContent =
        "Your game file must be an .html file.";

      gameFileInput.focus();
      return;
    }

    if (uploadStatus) {
      uploadStatus.textContent =
        "Your form works! Real game publishing is not connected yet.";
    }

  });
}


/* =================================
   CHECK REQUIRED PAGE ELEMENTS
================================= */

if (
  !postGameButton ||
  !overlay ||
  !closeButton ||
  !uploadForm ||
  !titleInput ||
  !gameFileInput ||
  !coverInput ||
  !coverPreview ||
  !uploadStatus
) {
  console.error(
    "VLAB: One or more upload form elements are missing from games.html."
  );
}
