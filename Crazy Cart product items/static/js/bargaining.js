/**
 * Bargaining functionality for CrazyCart
 * Handles bargain requests, counter offers, and related interactions
 */

let currentBargainId = null;

/**
 * Get CSRF token from cookie
 * @param {string} name - Cookie name
 */
function getCookie(name) {
  let cookieValue = null;
  if (document.cookie && document.cookie !== "") {
    const cookies = document.cookie.split(";");
    for (let i = 0; i < cookies.length; i++) {
      const cookie = cookies[i].trim();
      if (cookie.substring(0, name.length + 1) === name + "=") {
        cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
        break;
      }
    }
  }
  return cookieValue;
}

/**
 * Accept a counter offer from seller
 * @param {number} bargainId - The ID of the bargain request
 */
function acceptCounterOffer(bargainId) {
  showConfirmDialog(
    "Are you sure you want to accept this counter offer?",
    () => {
      const formData = new FormData();
      formData.append("action", "accept");

      // Get CSRF token from meta tag or cookie
      let csrfToken = document.querySelector("[name=csrf-token]")?.content;
      if (!csrfToken) {
        csrfToken = getCookie("csrftoken");
      }

      console.log("Accepting counter offer:", bargainId);
      console.log("CSRF Token:", csrfToken);

      fetch(`/bargaining/${bargainId}/respond/`, {
        method: "POST",
        headers: {
          "X-CSRFToken": csrfToken,
        },
        body: formData,
      })
        .then((response) => {
          console.log("Response status:", response.status);
          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }
          return response.json();
        })
        .then((data) => {
          console.log("Response data:", data);
          if (data.success) {
            showAlert("Counter offer accepted successfully!", "success");

            // Enhanced debugging for redirect
            console.log("Redirect URL provided:", data.redirect_url);
            console.log("Agreed price:", data.agreed_price);
            console.log("Quantity:", data.quantity);

            // If there's a redirect URL, redirect to it
            if (data.redirect_url) {
              console.log("Redirecting in 1.5 seconds:", data.redirect_url);

              setTimeout(() => {
                console.log("Executing redirect now...");
                window.location.href = data.redirect_url;
              }, 1500);
            } else {
              console.log("No redirect URL provided, reloading page");
              setTimeout(() => location.reload(), 1000);
            }
          } else {
            showAlert(
              data.message || "Failed to accept counter offer",
              "error"
            );
          }
        })
        .catch((error) => {
          console.error("Error:", error);

          // Check if it's a specific HTTP error
          if (error.message && error.message.includes("500")) {
            showAlert(
              "Server error occurred. Please try again later.",
              "error"
            );
          } else if (error.message && error.message.includes("403")) {
            showAlert("Access denied. Please refresh and try again.", "error");
          } else if (error.message && error.message.includes("404")) {
            showAlert("Bargain not found. Please refresh the page.", "error");
          } else {
            showAlert(
              "An error occurred while accepting the counter offer",
              "error"
            );
          }
        });
    }
  );
}

/**
 * Accept a bargain offer (for sellers)
 * @param {number} bargainId - The ID of the bargain request
 */
function acceptBargain(bargainId) {
  showConfirmDialog(
    "Are you sure you want to accept this bargain offer?",
    () => {
      const formData = new FormData();
      formData.append("action", "accept");

      // Get CSRF token from meta tag or cookie
      let csrfToken = document.querySelector("[name=csrf-token]")?.content;
      if (!csrfToken) {
        csrfToken = getCookie("csrftoken");
      }

      console.log("Accepting bargain:", bargainId);
      console.log("CSRF Token:", csrfToken);

      fetch(`/bargaining/${bargainId}/respond/`, {
        method: "POST",
        headers: {
          "X-CSRFToken": csrfToken,
        },
        body: formData,
      })
        .then((response) => {
          console.log("Response status:", response.status);
          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }
          return response.json();
        })
        .then((data) => {
          console.log("Response data:", data);
          if (data.success) {
            showAlert("Bargain accepted successfully!", "success");

            // Enhanced debugging for redirect
            console.log("Redirect URL provided:", data.redirect_url);
            console.log("Agreed price:", data.agreed_price);
            console.log("Quantity:", data.quantity);

            // If there's a redirect URL, redirect to it
            if (data.redirect_url) {
              console.log("Redirecting in 1.5 seconds:", data.redirect_url);

              setTimeout(() => {
                console.log("Executing redirect now...");
                window.location.href = data.redirect_url;
              }, 1500);
            } else {
              console.log("No redirect URL provided, reloading page");
              setTimeout(() => location.reload(), 1000);
            }
          } else {
            showAlert(data.message || "Failed to accept bargain", "error");
          }
        })
        .catch((error) => {
          console.error("Error:", error);

          // Check if it's a specific HTTP error
          if (error.message && error.message.includes("500")) {
            showAlert(
              "Server error occurred. Please try again later.",
              "error"
            );
          } else if (error.message && error.message.includes("403")) {
            showAlert("Access denied. Please refresh and try again.", "error");
          } else if (error.message && error.message.includes("404")) {
            showAlert("Bargain not found. Please refresh the page.", "error");
          } else {
            showAlert("An error occurred while accepting the bargain", "error");
          }
        });
    }
  );
}

/**
 * Reject a bargain offer (for sellers)
 * @param {number} bargainId - The ID of the bargain request
 */
function rejectBargain(bargainId) {
  showConfirmDialog(
    "Are you sure you want to reject this bargain offer?",
    () => {
      const formData = new FormData();
      formData.append("action", "reject");

      // Get CSRF token from meta tag or cookie
      let csrfToken = document.querySelector("[name=csrf-token]")?.content;
      if (!csrfToken) {
        csrfToken = getCookie("csrftoken");
      }

      fetch(`/bargaining/${bargainId}/respond/`, {
        method: "POST",
        headers: {
          "X-CSRFToken": csrfToken,
        },
        body: formData,
      })
        .then((response) => response.json())
        .then((data) => {
          if (data.success) {
            showAlert("Bargain rejected successfully!", "success");
            setTimeout(() => location.reload(), 1000);
          } else {
            showAlert(data.message || "Failed to reject bargain", "error");
          }
        })
        .catch((error) => {
          console.error("Error:", error);
          showAlert("Failed to reject bargain", "error");
        });
    }
  );
}

/**
 * Show the counter offer modal
 * @param {number} bargainId - The ID of the bargain request
 * @param {number} originalOffer - The original offer amount (optional, for sellers)
 */
function showCounterOfferModal(bargainId, originalOffer = null) {
  currentBargainId = bargainId;

  // Update original offer display if provided (for seller view)
  if (originalOffer && document.getElementById("originalOffer")) {
    document.getElementById("originalOffer").textContent = originalOffer;
  }

  const modal = document.getElementById("counterOfferModal");
  if (modal) {
    modal.classList.remove("hidden");

    // Focus on the price input
    const priceInput = document.getElementById("counterPrice");
    if (priceInput) {
      setTimeout(() => priceInput.focus(), 100);
    }
  }
}

/**
 * Hide the counter offer modal
 */
function hideCounterOfferModal() {
  currentBargainId = null;
  const modal = document.getElementById("counterOfferModal");
  if (modal) {
    modal.classList.add("hidden");
  }

  const form = document.getElementById("counterOfferForm");
  if (form) {
    form.reset();
  }
}

/**
 * Create a new bargain request (for product pages)
 * @param {number} productId - The ID of the product
 * @param {number} offeredPrice - The offered price
 * @param {string} message - Optional message
 * @param {number} quantity - Quantity requested
 */
function createBargainRequest(
  productId,
  offeredPrice,
  message = "",
  quantity = 1
) {
  const formData = new FormData();
  formData.append("product_id", productId);
  formData.append("offered_price", offeredPrice);
  formData.append("message", message);
  formData.append("quantity", quantity);

  // Get CSRF token from meta tag or cookie
  let csrfToken = document.querySelector("[name=csrf-token]")?.content;
  if (!csrfToken) {
    csrfToken = getCookie("csrftoken");
  }

  fetch("/bargaining/create/", {
    method: "POST",
    headers: {
      "X-CSRFToken": csrfToken,
    },
    body: formData,
  })
    .then((response) => response.json())
    .then((data) => {
      if (data.success) {
        showAlert("Bargain request sent successfully!", "success");
        // Optionally redirect or update UI
      } else {
        showAlert(data.message || "Failed to send bargain request", "error");
      }
    })
    .catch((error) => {
      console.error("Error:", error);
      showAlert("Failed to send bargain request", "error");
    });
}

/**
 * Initialize bargaining functionality when DOM is loaded
 */
document.addEventListener("DOMContentLoaded", function () {
  // Set up counter offer form submission
  const counterOfferForm = document.getElementById("counterOfferForm");
  if (counterOfferForm) {
    counterOfferForm.addEventListener("submit", function (e) {
      e.preventDefault();

      const price = document.getElementById("counterPrice").value;
      const message = document.getElementById("counterMessage").value;

      // Validate inputs
      if (!price || price <= 0) {
        showAlert("Please enter a valid counter offer amount", "warning");
        return;
      }

      if (!message || message.trim().length === 0) {
        showAlert(
          "Please provide a message explaining your counter offer",
          "warning"
        );
        return;
      }

      // For bargain detail page, get bargain ID from the page context
      let bargainId = currentBargainId;

      // If no currentBargainId is set, try to get it from data attributes or URL
      if (!bargainId) {
        // Check if there's a data attribute on the form
        bargainId = counterOfferForm.dataset.bargainId;

        // If still no ID, try to extract from current URL (for detail page)
        if (!bargainId && window.location.pathname.includes("/bargaining/")) {
          const pathParts = window.location.pathname.split("/");
          const bargainIndex = pathParts.indexOf("bargaining") + 1;
          if (pathParts[bargainIndex] && !isNaN(pathParts[bargainIndex])) {
            bargainId = pathParts[bargainIndex];
          }
        }
      }

      if (!bargainId) {
        showAlert("No bargain selected", "warning");
        return;
      }

      const formData = new FormData();
      formData.append("action", "counter");
      formData.append("counter_offer", price);
      formData.append("message", message);

      // Get CSRF token from meta tag or cookie
      let csrfToken = document.querySelector("[name=csrf-token]")?.content;
      if (!csrfToken) {
        csrfToken = getCookie("csrftoken");
      }

      console.log("Sending counter offer for bargain:", bargainId);
      console.log("Price:", price, "Message:", message);
      console.log("CSRF Token:", csrfToken);

      fetch(`/bargaining/${bargainId}/respond/`, {
        method: "POST",
        headers: {
          "X-CSRFToken": csrfToken,
        },
        body: formData,
      })
        .then((response) => {
          console.log("Response status:", response.status);
          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }
          return response.json();
        })
        .then((data) => {
          console.log("Response data:", data);
          if (data.success) {
            hideCounterOfferModal();
            showAlert("Counter offer sent successfully!", "success");
            setTimeout(() => location.reload(), 1000);
          } else {
            showAlert(data.message || "Failed to send counter offer", "error");
          }
        })
        .catch((error) => {
          console.error("Error:", error);
          showAlert(
            "An error occurred while sending the counter offer",
            "error"
          );
        });
    });
  }

  // Close modal when clicking outside
  const modal = document.getElementById("counterOfferModal");
  if (modal) {
    modal.addEventListener("click", function (e) {
      if (e.target === this) {
        hideCounterOfferModal();
      }
    });
  }

  // Close modal with Escape key
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && modal && !modal.classList.contains("hidden")) {
      hideCounterOfferModal();
    }
  });
});

// Export functions to global scope for onclick handlers
window.acceptCounterOffer = acceptCounterOffer;
window.acceptBargain = acceptBargain;
window.rejectBargain = rejectBargain;
window.showCounterOfferModal = showCounterOfferModal;
window.hideCounterOfferModal = hideCounterOfferModal;
window.createBargainRequest = createBargainRequest;

// Confirm functions are loaded
console.log("Bargaining.js loaded successfully - all functions available");

// For debugging - list all available functions
console.log("Available bargaining functions:", {
  acceptCounterOffer: typeof window.acceptCounterOffer,
  acceptBargain: typeof window.acceptBargain,
  rejectBargain: typeof window.rejectBargain,
  showCounterOfferModal: typeof window.showCounterOfferModal,
  hideCounterOfferModal: typeof window.hideCounterOfferModal,
  createBargainRequest: typeof window.createBargainRequest,
});
