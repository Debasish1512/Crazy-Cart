/**
 * Cart functionality for CrazyCart
 * Handles adding items to cart, updating quantities, and cart management
 */

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
        setTimeout(() => {
          window.location.href = "/accounts/login/";
        }, 2000);
        return;
      }
      return response.json();
    })
    .then((data) => {
      console.log("Response data:", data);
      if (data && data.success) {
        showNotification("Product added to cart!", "success");
        updateCartCount(data.cart_count);
      } else if (data) {
        showNotification(data.message || "Error adding to cart", "error");
      }
    })
    .catch((error) => {
      console.error("Error:", error);
      showNotification("Error adding to cart", "error");
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

// Buy Now function
function buyNow(productId, quantity = 1) {
  console.log("=== BUY NOW FUNCTION CALLED ===");
  console.log("Buy now clicked:", productId, quantity);

  const token = getCSRFToken();
  console.log("CSRF Token:", token);

  if (!token) {
    console.error("No CSRF token found!");
    showNotification("CSRF token not found. Please refresh the page.", "error");
    return;
  }

  // Show loading notification
  console.log("Showing loading notification...");
  showNotification("Preparing checkout...", "info");

  console.log("Making fetch request to /cart/buy-now/");
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
      console.log("Response received, status:", response.status);
      if (response.status === 403 || response.status === 401) {
        console.log("Authentication error");
        showNotification("Please log in to purchase", "error");
        setTimeout(() => {
          window.location.href = "/accounts/login/";
        }, 2000);
        return;
      }
      return response.json();
    })
    .then((data) => {
      console.log("Response data received:", data);
      if (data && data.success) {
        console.log("Success! Redirecting to:", data.redirect_url);
        // Redirect to buy now checkout page
        window.location.href = data.redirect_url;
      } else if (data) {
        console.log("Error:", data.message);
        showNotification(data.message || "Error processing request", "error");
      }
    })
    .catch((error) => {
      console.error("Fetch error:", error);
      showNotification("Error processing request", "error");
    });
}

function updateCartCount(count) {
  const cartBadge = document.querySelector(".cart-count");
  if (cartBadge) {
    cartBadge.textContent = count;
    cartBadge.style.display = count > 0 ? "inline" : "none";
  }
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

// Initialize cart functionality
function initializeCart() {
  console.log("Initializing cart functionality");

  // Add to cart buttons
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
  console.log("=== BUY NOW BUTTON SETUP ===");
  console.log("Found", buyNowButtons.length, "buy-now buttons");
  console.log("Buy Now buttons:", buyNowButtons);

  buyNowButtons.forEach((button, index) => {
    console.log(`Setting up event listener for button ${index}:`, button);
    button.addEventListener("click", function (e) {
      e.preventDefault();
      console.log("=== BUY NOW BUTTON CLICKED ===");
      console.log("Button clicked:", this);
      console.log("Dataset:", this.dataset);

      const productId = this.dataset.productId;
      const quantity = this.dataset.quantity || 1;
      console.log("Product ID:", productId, "Quantity:", quantity);

      if (!productId) {
        console.error("No product ID found on button!");
        showNotification(
          "Product ID not found. Please refresh the page.",
          "error"
        );
        return;
      }

      buyNow(productId, quantity);
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

  // Clear cart buttons
  const clearCartButtons = document.querySelectorAll(".clear-cart-btn");
  clearCartButtons.forEach((button) => {
    button.addEventListener("click", function (e) {
      e.preventDefault();
      const clearUrl = this.dataset.clearUrl;
      showClearCartModal(clearUrl);
    });
  });
}

// Auto-initialize when DOM is loaded
document.addEventListener("DOMContentLoaded", initializeCart);

// Export functions
window.CrazyCartCart = {
  addToCart,
  buyNow,
  updateCartItem,
  updateCartCount,
  showClearCartModal,
  initializeCart,
};
