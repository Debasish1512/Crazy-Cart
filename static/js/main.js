// Main JavaScript for CrazyCart

// CSRF Token for AJAX requests (global scope)
let csrfToken = null;

// Function to get CSRF token
function getCSRFToken() {
  if (!csrfToken) {
    csrfToken =
      document
        .querySelector("meta[name=csrf-token]")
        ?.getAttribute("content") ||
      document.querySelector("[name=csrfmiddlewaretoken]")?.value;
  }
  return csrfToken;
}

document.addEventListener("DOMContentLoaded", function () {
  console.log("DOM Content Loaded - Setting up event listeners");

  // Cart functionality
  const addToCartButtons = document.querySelectorAll(".add-to-cart");
  console.log("Found", addToCartButtons.length, "add-to-cart buttons");

  addToCartButtons.forEach((button) => {
    button.addEventListener("click", function (e) {
      e.preventDefault();
      console.log("Add to cart button clicked");
      const productId = this.dataset.productId;
      const quantity = this.dataset.quantity || 1;
      console.log("Product ID:", productId, "Quantity:", quantity);

      addToCart(productId, quantity);
    });
  });

  // Buy Now functionality
  const buyNowButtons = document.querySelectorAll(".buy-now");
  console.log("Found", buyNowButtons.length, "buy-now buttons");

  buyNowButtons.forEach((button) => {
    button.addEventListener("click", function (e) {
      e.preventDefault();
      console.log("Buy now button clicked");
      const productId = this.dataset.productId;
      const quantity = this.dataset.quantity || 1;
      console.log("Product ID:", productId, "Quantity:", quantity);

      buyNow(productId, quantity);
    });
  });

  // Wishlist functionality
  const wishlistButtons = document.querySelectorAll(".toggle-wishlist");
  wishlistButtons.forEach((button) => {
    button.addEventListener("click", function (e) {
      e.preventDefault();
      const productId = this.dataset.productId;
      toggleWishlist(productId, this);
    });
  });

  // Quantity selectors
  const quantityInputs = document.querySelectorAll(".quantity-input");
  quantityInputs.forEach((input) => {
    input.addEventListener("change", function () {
      const cartItemId = this.dataset.cartItemId;
      const quantity = parseInt(this.value);

      if (quantity > 0) {
        updateCartItem(cartItemId, quantity);
      }
    });
  });

  // Image gallery
  const productImages = document.querySelectorAll(".product-image-thumb");
  productImages.forEach((img) => {
    img.addEventListener("click", function () {
      const mainImage = document.querySelector(".product-main-image");
      if (mainImage) {
        mainImage.src = this.src;

        // Update active state
        productImages.forEach((i) =>
          i.classList.remove("ring-2", "ring-blue-500")
        );
        this.classList.add("ring-2", "ring-blue-500");
      }
    });
  });

  // Bargaining modal
  const bargainButtons = document.querySelectorAll(".bargain-button");
  bargainButtons.forEach((button) => {
    button.addEventListener("click", function (e) {
      e.preventDefault();
      const productId = this.dataset.productId;
      const originalPrice = this.dataset.originalPrice;

      showBargainModal(productId, originalPrice);
    });
  });

  // Clear cart modal
  const clearCartButtons = document.querySelectorAll(".clear-cart-btn");
  clearCartButtons.forEach((button) => {
    button.addEventListener("click", function (e) {
      e.preventDefault();
      const clearUrl = this.dataset.clearUrl;
      showClearCartModal(clearUrl);
    });
  });

  // Search suggestions
  const searchInput = document.querySelector('input[name="q"]');
  if (searchInput) {
    let searchTimeout;
    searchInput.addEventListener("input", function () {
      clearTimeout(searchTimeout);
      searchTimeout = setTimeout(() => {
        const query = this.value.trim();
        if (query.length > 2) {
          fetchSearchSuggestions(query);
        }
      }, 300);
    });
  }

  // Auto-hide alerts
  const alerts = document.querySelectorAll(".alert");
  alerts.forEach((alert) => {
    setTimeout(() => {
      alert.style.opacity = "0";
      setTimeout(() => {
        alert.remove();
      }, 300);
    }, 5000);
  });
});

// Cart functions
function addToCart(productId, quantity = 1) {
  console.log("Adding to cart:", productId, quantity);

  const token = getCSRFToken();
  console.log("CSRF Token:", token);

  if (!token) {
    showNotification("CSRF token not found. Please refresh the page.", "error");
    return;
  }

  fetch("/cart/add/", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-CSRFToken": token,
    },
    body: JSON.stringify({
      product_id: productId,
      quantity: quantity,
    }),
  })
    .then((response) => {
      console.log("Response status:", response.status);
      if (response.status === 403 || response.status === 401) {
        showNotification("Please log in to add items to cart", "error");
        // Optionally redirect to login page
        setTimeout(() => {
          window.location.href = "/accounts/login/";
        }, 2000);
        return;
      }
      return response.json();
    })
    .then((data) => {
      console.log("Response data:", data);
      if (data.success) {
        showNotification("Product added to cart!", "success");
        updateCartCount(data.cart_count);
      } else {
        showNotification(data.message || "Error adding to cart", "error");
      }
    })
    .catch((error) => {
      console.error("Error:", error);
      showNotification("Error adding to cart", "error");
    });
}

// Buy Now function
function buyNow(productId, quantity = 1) {
  console.log("Buy now clicked:", productId, quantity);

  const token = getCSRFToken();
  console.log("CSRF Token:", token);

  if (!token) {
    showNotification("CSRF token not found. Please refresh the page.", "error");
    return;
  }

  // Show loading notification
  showNotification("Preparing checkout...", "info");

  fetch("/cart/buy-now/", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-CSRFToken": token,
    },
    body: JSON.stringify({
      product_id: productId,
      quantity: quantity,
    }),
  })
    .then((response) => {
      console.log("Response status:", response.status);
      if (response.status === 403 || response.status === 401) {
        showNotification("Please log in to purchase", "error");
        setTimeout(() => {
          window.location.href = "/accounts/login/";
        }, 2000);
        return;
      }
      return response.json();
    })
    .then((data) => {
      console.log("Response data:", data);
      if (data.success) {
        // Redirect to buy now checkout page
        window.location.href = data.redirect_url;
      } else {
        showNotification(data.message || "Error processing request", "error");
      }
    })
    .catch((error) => {
      console.error("Error:", error);
      showNotification("Error processing request", "error");
    });
}

function updateCartItem(cartItemId, quantity) {
  const token = getCSRFToken();
  if (!token) {
    showNotification("CSRF token not found. Please refresh the page.", "error");
    return;
  }

  fetch("/cart/update/", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-CSRFToken": token,
    },
    body: JSON.stringify({
      cart_item_id: cartItemId,
      quantity: quantity,
    }),
  })
    .then((response) => {
      if (response.status === 403 || response.status === 401) {
        showNotification("Please log in to update cart", "error");
        setTimeout(() => {
          window.location.href = "/accounts/login/";
        }, 2000);
        return;
      }
      return response.json();
    })
    .then((data) => {
      if (data && data.success) {
        location.reload(); // Reload to update totals
      } else if (data) {
        showNotification(data.message || "Error updating cart", "error");
      }
    })
    .catch((error) => {
      console.error("Error:", error);
      showNotification("Error updating cart", "error");
    });
}

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
          // Check if it's a heart icon or full button
          if (
            button.innerHTML.includes("❤️") ||
            button.innerHTML.includes("🤍")
          ) {
            button.innerHTML = "❤️";
          } else {
            // Full button with SVG and text
            button.innerHTML = `
              <svg class="w-5 h-5 inline mr-2 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clip-rule="evenodd"></path>
              </svg>
              Remove from Wishlist
            `;
          }
          showNotification("Added to wishlist!", "success");
        } else {
          button.classList.remove("in-wishlist");
          // Check if it's a heart icon or full button
          if (
            button.innerHTML.includes("❤️") ||
            button.innerHTML.includes("🤍")
          ) {
            button.innerHTML = "🤍";
          } else {
            // Full button with SVG and text
            button.innerHTML = `
              <svg class="w-5 h-5 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"></path>
              </svg>
              Add to Wishlist
            `;
          }
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

// Bargaining functions
function showBargainModal(productId, originalPrice) {
  const modal = document.createElement("div");
  modal.className =
    "fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50";
  modal.innerHTML = `
        <div class="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 class="text-xl font-bold mb-4">Make an Offer</h3>
            <form id="bargain-form">
                <div class="mb-4">
                    <label class="block text-sm font-medium text-gray-700 mb-2">Original Price</label>
                    <div class="text-lg font-bold text-gray-900">৳${originalPrice}</div>
                </div>
                <div class="mb-4">
                    <label for="offered-price" class="block text-sm font-medium text-gray-700 mb-2">Your Offer</label>
                    <input type="number" id="offered-price" name="offered_price" step="0.01" max="${originalPrice}" 
                           class="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600" 
                           placeholder="Enter your offer" required>
                </div>
                <div class="mb-4">
                    <label for="bargain-message" class="block text-sm font-medium text-gray-700 mb-2">Message (Optional)</label>
                    <textarea id="bargain-message" name="message" rows="3" 
                              class="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600" 
                              placeholder="Add a message to the seller..."></textarea>
                </div>
                <div class="flex justify-end space-x-4">
                    <button type="button" class="cancel-bargain px-4 py-2 text-gray-600 bg-gray-200 rounded-lg hover:bg-gray-300">
                        Cancel
                    </button>
                    <button type="submit" class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                        Send Offer
                    </button>
                </div>
            </form>
        </div>
    `;

  document.body.appendChild(modal);

  // Handle form submission
  const form = modal.querySelector("#bargain-form");
  form.addEventListener("submit", function (e) {
    e.preventDefault();
    const formData = new FormData(form);
    formData.append("product_id", productId);

    const token = getCSRFToken();
    if (!token) {
      showNotification(
        "CSRF token not found. Please refresh the page.",
        "error"
      );
      return;
    }

    fetch("/bargaining/request/", {
      method: "POST",
      headers: {
        "X-CSRFToken": token,
      },
      body: formData,
    })
      .then((response) => {
        if (response.status === 403 || response.status === 401) {
          showNotification("Please log in to make bargain requests", "error");
          setTimeout(() => {
            window.location.href = "/accounts/login/";
          }, 2000);
          return;
        }
        return response.json();
      })
      .then((data) => {
        if (data && data.success) {
          showNotification("Bargain request sent!", "success");
          modal.remove();
        } else if (data) {
          showNotification(
            data.message || "Error sending bargain request",
            "error"
          );
        }
      })
      .catch((error) => {
        console.error("Error:", error);
        showNotification("Error sending bargain request", "error");
      });
  });

  // Handle cancel
  modal.querySelector(".cancel-bargain").addEventListener("click", () => {
    modal.remove();
  });

  // Close on outside click
  modal.addEventListener("click", function (e) {
    if (e.target === modal) {
      modal.remove();
    }
  });
}

// Clear Cart Modal function
function showClearCartModal(clearUrl) {
  const modal = document.createElement("div");
  modal.className =
    "fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50";
  modal.innerHTML = `
        <div class="bg-white rounded-lg p-6 w-full max-w-md">
            <div class="flex items-center justify-center w-12 h-12 mx-auto mb-4 bg-red-100 rounded-full">
                <svg class="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                          d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z"></path>
                </svg>
            </div>
            <h3 class="text-xl font-bold text-center mb-4 text-gray-900">Clear Cart</h3>
            <p class="text-center text-gray-600 mb-6">
                Are you sure you want to clear your cart? This action cannot be undone and all items will be removed.
            </p>
            <div class="flex justify-center space-x-4">
                <button type="button" class="cancel-clear-cart px-6 py-2 text-gray-600 bg-gray-200 rounded-lg hover:bg-gray-300 transition-colors">
                    Cancel
                </button>
                <button type="button" class="confirm-clear-cart px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors">
                    Clear Cart
                </button>
            </div>
        </div>
    `;

  document.body.appendChild(modal);

  // Handle confirmation
  const confirmButton = modal.querySelector(".confirm-clear-cart");
  confirmButton.addEventListener("click", function () {
    // Create a form and submit it to clear the cart
    const form = document.createElement("form");
    form.method = "POST";
    form.action = clearUrl;

    // Add CSRF token
    const csrfInput = document.createElement("input");
    csrfInput.type = "hidden";
    csrfInput.name = "csrfmiddlewaretoken";
    csrfInput.value = getCSRFToken();
    form.appendChild(csrfInput);

    document.body.appendChild(form);
    form.submit();
  });

  // Handle cancel
  const cancelButton = modal.querySelector(".cancel-clear-cart");
  cancelButton.addEventListener("click", () => {
    modal.remove();
  });

  // Close on outside click
  modal.addEventListener("click", function (e) {
    if (e.target === modal) {
      modal.remove();
    }
  });

  // Close on Escape key
  document.addEventListener("keydown", function escapeHandler(e) {
    if (e.key === "Escape") {
      modal.remove();
      document.removeEventListener("keydown", escapeHandler);
    }
  });
}

// Utility functions
function updateCartCount(count) {
  const cartBadge = document.querySelector(".cart-count");
  if (cartBadge) {
    cartBadge.textContent = count;
    cartBadge.style.display = count > 0 ? "inline" : "none";
  }
}

function showNotification(message, type = "info") {
  const notification = document.createElement("div");
  notification.className = `fixed top-4 right-4 z-50 min-w-64 max-w-sm p-4 rounded-lg shadow-lg transition-opacity duration-300`;

  // Add type-specific styling
  if (type === "success") {
    notification.classList.add("bg-green-500", "text-white");
  } else if (type === "error") {
    notification.classList.add("bg-red-500", "text-white");
  } else {
    notification.classList.add("bg-blue-500", "text-white");
  }

  notification.textContent = message;
  notification.style.opacity = "1";

  document.body.appendChild(notification);

  setTimeout(() => {
    notification.style.opacity = "0";
    setTimeout(() => {
      notification.remove();
    }, 300);
  }, 3000);
}

function fetchSearchSuggestions(query) {
  fetch(`/products/search/?q=${encodeURIComponent(query)}&format=json`)
    .then((response) => response.json())
    .then((data) => {
      // Implement search suggestions dropdown if needed
      console.log("Search suggestions:", data);
    })
    .catch((error) => {
      console.error("Search error:", error);
    });
}

// Price formatting
function formatPrice(price) {
  return parseFloat(price).toFixed(2) + " BDT";
}

// Form validation helpers
function validateEmail(email) {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
}

function validatePassword(password) {
  return password.length >= 6;
}

// Export functions for use in other scripts
window.CrazyCartJS = {
  addToCart,
  updateCartItem,
  toggleWishlist,
  showBargainModal,
  showClearCartModal,
  showNotification,
  formatPrice,
  validateEmail,
  validatePassword,
};
