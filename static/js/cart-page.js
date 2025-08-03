/**
 * Cart page specific JavaScript
 * Additional functionality specific to the cart/checkout page
 */

// Initialize cart page specific functionality
function initializeCartPage() {
  console.log("Initializing cart page functionality");

  // Enhanced quantity controls
  const quantityControls = document.querySelectorAll(".quantity-control");
  quantityControls.forEach((control) => {
    const minusBtn = control.querySelector(".quantity-minus");
    const plusBtn = control.querySelector(".quantity-plus");
    const input = control.querySelector(".quantity-input");

    if (minusBtn && plusBtn && input) {
      minusBtn.addEventListener("click", () => {
        const currentValue = parseInt(input.value) || 1;
        if (currentValue > 1) {
          input.value = currentValue - 1;
          input.dispatchEvent(new Event("change"));
        }
      });

      plusBtn.addEventListener("click", () => {
        const currentValue = parseInt(input.value) || 1;
        const maxValue = parseInt(input.getAttribute("max")) || 999;
        if (currentValue < maxValue) {
          input.value = currentValue + 1;
          input.dispatchEvent(new Event("change"));
        }
      });
    }
  });

  // Discount code functionality
  const discountForm = document.querySelector(".discount-form");
  if (discountForm) {
    discountForm.addEventListener("submit", function (e) {
      e.preventDefault();
      applyDiscountCode(this);
    });
  }

  // Save for later functionality
  const saveForLaterBtns = document.querySelectorAll(".save-for-later");
  saveForLaterBtns.forEach((btn) => {
    btn.addEventListener("click", function (e) {
      e.preventDefault();
      const { cartItemId } = this.dataset;
      saveItemForLater(cartItemId);
    });
  });
}

function applyDiscountCode(form) {
  const formData = new FormData(form);
  const token = getCSRFToken();

  if (!token) {
    showNotification("CSRF token not found. Please refresh the page.", "error");
    return;
  }

  fetch(form.action, {
    method: "POST",
    headers: {
      "X-CSRFToken": token,
    },
    body: formData,
  })
    .then((response) => response.json())
    .then((data) => {
      if (data.success) {
        showNotification("Discount applied successfully!", "success");
        setTimeout(() => location.reload(), 1000);
      } else {
        showNotification(data.message || "Invalid discount code", "error");
      }
    })
    .catch((error) => {
      console.error("Error applying discount:", error);
      showNotification("Error applying discount code", "error");
    });
}

function saveItemForLater(cartItemId) {
  const token = getCSRFToken();
  if (!token) {
    showNotification("CSRF token not found. Please refresh the page.", "error");
    return;
  }

  fetch("/cart/save-for-later/", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-CSRFToken": token,
    },
    body: JSON.stringify({
      cart_item_id: cartItemId,
    }),
  })
    .then((response) => response.json())
    .then((data) => {
      if (data.success) {
        showNotification("Item saved for later!", "success");
        setTimeout(() => location.reload(), 1000);
      } else {
        showNotification(data.message || "Error saving item", "error");
      }
    })
    .catch((error) => {
      console.error("Error saving item:", error);
      showNotification("Error saving item for later", "error");
    });
}

// Only initialize if we're on a cart page
if (
  document.querySelector(".cart-page") ||
  document.querySelector("#cart-items")
) {
  document.addEventListener("DOMContentLoaded", initializeCartPage);
}

// Export functions
window.CrazyCartCartPage = {
  initializeCartPage,
  applyDiscountCode,
  saveItemForLater,
};
