/**
 * Common JavaScript utilities for CrazyCart
 * Contains shared functions used across multiple pages
 */

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

// Notification system
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

// Auto-hide alerts function
function setupAlertAutoHide() {
  const alerts = document.querySelectorAll(".alert");
  alerts.forEach((alert) => {
    setTimeout(() => {
      alert.style.opacity = "0";
      setTimeout(() => {
        alert.remove();
      }, 300);
    }, 5000);
  });
}

// Common initialization
document.addEventListener("DOMContentLoaded", function () {
  console.log("Common utilities loaded");
  setupAlertAutoHide();
});

// Export functions to global scope for backward compatibility
window.CrazyCartCommon = {
  getCSRFToken,
  showNotification,
  formatPrice,
  validateEmail,
  validatePassword,
  setupAlertAutoHide,
};
