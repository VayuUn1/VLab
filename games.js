
/* ================================
   VLAB GAME HUB
   Main JavaScript
================================ */

// Get page elements
const postGameButton = document.getElementById("post-game-btn");


// ================================
// POST GAME POPUP
// ================================

function openPostGamePopup() {

  // Don't create duplicate popups
  if (document.getElementById("post-game-popup")) {
    return;
  }

  // Create popup background
  const overlay = document.createElement("div");
  overlay.id = "post-game-popup";
  overlay.className = "post-game-overlay";

  // Create popup content
  overlay.innerHTML = `
    <div class="post-game-popup">

      <button
        class="close-popup-btn"
        id="close-post-popup"
        aria-label="Close popup"
      >
        &times;
      </button>

      <div class="popup-icon">🎮</div>

      <h2>Post a Game</h2>

      <p>
        Your creator journey starts here!
      </p>

      <div class="popup-coming-soon">
        Uploading games is coming soon.
      </div>

    </div>
  `;

  document.body.appendChild(overlay);

  // Close button
  document
    .getElementById("close-post-popup")
    .addEventListener("click", closePostGamePopup);

  // Close when clicking outside
  overlay.addEventListener("click", function(event) {
    if (event.target === overlay) {
      closePostGamePopup();
    }
  });

}


// ================================
// CLOSE POPUP
// ================================

function closePostGamePopup() {

  const popup = document.getElementById("post-game-popup");

  if (popup) {
    popup.remove();
  }

}


// ================================
// BUTTON EVENT
// ================================

if (postGameButton) {

  postGameButton.addEventListener("click", function() {
    openPostGamePopup();
  });

}
