/**
 * Product-related functionality for CrazyCart
 * Handles product galleries, bargaining, and product interactions
 */

// Image gallery functionality
function initializeImageGallery() {
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
}

// Bargaining modal functionality
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
                    <div class="text-lg font-bold text-gray-900">${originalPrice} BDT</div>
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

  // Close on Escape key
  document.addEventListener("keydown", function escapeHandler(e) {
    if (e.key === "Escape") {
      modal.remove();
      document.removeEventListener("keydown", escapeHandler);
    }
  });
}

// Initialize product functionality
function initializeProduct() {
  console.log("Initializing product functionality");

  // Initialize image gallery
  initializeImageGallery();

  // Bargaining buttons
  const bargainButtons = document.querySelectorAll(".bargain-button");
  bargainButtons.forEach((button) => {
    button.addEventListener("click", function (e) {
      e.preventDefault();
      const { productId, originalPrice } = this.dataset;
      showBargainModal(productId, originalPrice);
    });
  });
}

// Auto-initialize when DOM is loaded
document.addEventListener("DOMContentLoaded", initializeProduct);

// Export functions
window.CrazyCartProduct = {
  initializeImageGallery,
  showBargainModal,
  initializeProduct,
};
