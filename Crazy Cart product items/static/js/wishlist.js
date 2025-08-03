/**
 * Wishlist functionality for CrazyCart
 * Handles adding/removing items from wishlist
 */

// Wishlist functions
function toggleWishlist(productId, button) {
  const isInWishlist = button.classList.contains("in-wishlist");
  const action = isInWishlist ? "remove" : "add";

  const token = getCSRFToken();
  if (!token) {
    showNotification("CSRF token not found. Please refresh the page.", "error");
    return;
  }

  const formData = new FormData();
  formData.append("product_id", productId);

  fetch(`/products/wishlist/${action}/`, {
    method: "POST",
    headers: {
      "X-CSRFToken": token,
    },
    body: formData,
  })
    .then((response) => {
      if (response.status === 403 || response.status === 401) {
        showNotification("Please log in to manage wishlist", "error");
        setTimeout(() => {
          window.location.href = "/accounts/login/";
        }, 2000);
        return;
      }
      return response.json();
    })
    .then((data) => {
      if (data && data.success) {
        if (action === "add") {
          button.classList.add("in-wishlist");
          updateWishlistButtonContent(button, true);
          showNotification("Added to wishlist!", "success");
        } else {
          button.classList.remove("in-wishlist");
          updateWishlistButtonContent(button, false);
          showNotification("Removed from wishlist!", "success");
        }
      } else if (data) {
        showNotification(data.message || "Error updating wishlist", "error");
      }
    })
    .catch((error) => {
      console.error("Error:", error);
      showNotification("Error updating wishlist", "error");
    });
}

function updateWishlistButtonContent(button, isInWishlist) {
  // Check if it's a heart icon or full button
  if (button.innerHTML.includes("❤️") || button.innerHTML.includes("🤍")) {
    button.innerHTML = isInWishlist ? "❤️" : "🤍";
  } else {
    // Full button with SVG and text
    if (isInWishlist) {
      button.innerHTML = `
        <svg class="w-5 h-5 inline mr-2 text-red-500" fill="currentColor" viewBox="0 0 20 20">
          <path fill-rule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clip-rule="evenodd"></path>
        </svg>
        Remove from Wishlist
      `;
    } else {
      button.innerHTML = `
        <svg class="w-5 h-5 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"></path>
        </svg>
        Add to Wishlist
      `;
    }
  }
}

// Initialize wishlist functionality
function initializeWishlist() {
  console.log("Initializing wishlist functionality");

  const wishlistButtons = document.querySelectorAll(".toggle-wishlist");
  wishlistButtons.forEach((button) => {
    button.addEventListener("click", function (e) {
      e.preventDefault();
      const { productId } = this.dataset;
      toggleWishlist(productId, this);
    });
  });

  // For wishlist page - remove buttons
  const removeButtons = document.querySelectorAll(".remove-from-wishlist");
  removeButtons.forEach((button) => {
    button.addEventListener("click", function (e) {
      e.preventDefault();
      const { productId } = this.dataset;
      removeFromWishlistPage(productId, this);
    });
  });
}

// Remove from wishlist on wishlist page
function removeFromWishlistPage(productId, button) {
  const token = getCSRFToken();
  if (!token) {
    showNotification("CSRF token not found. Please refresh the page.", "error");
    return;
  }

  const formData = new FormData();
  formData.append("product_id", productId);

  fetch("/products/wishlist/remove/", {
    method: "POST",
    headers: {
      "X-CSRFToken": token,
    },
    body: formData,
  })
    .then((response) => response.json())
    .then((data) => {
      if (data.success) {
        // Remove the card from the page
        const card = button.closest(".bg-white");
        if (card) {
          card.remove();
        }

        // Update counter if exists
        const counter = document.querySelector(".text-gray-600");
        if (counter) {
          const currentCount = parseInt(
            counter.textContent.match(/\d+/)?.[0] || "0"
          );
          const newCount = currentCount - 1;
          counter.textContent = `${newCount} items`;
        }

        // Show empty state if no items left
        const grid = document.querySelector(".grid");
        if (grid && grid.children.length === 0) {
          location.reload();
        }

        showNotification("Removed from wishlist!", "success");
      } else {
        showNotification(
          data.message || "Error removing from wishlist",
          "error"
        );
      }
    })
    .catch((error) => {
      console.error("Error:", error);
      showNotification("Error removing from wishlist", "error");
    });
}

// Auto-initialize when DOM is loaded
document.addEventListener("DOMContentLoaded", initializeWishlist);

// Export functions
window.CrazyCartWishlist = {
  toggleWishlist,
  updateWishlistButtonContent,
  removeFromWishlistPage,
  initializeWishlist,
};
