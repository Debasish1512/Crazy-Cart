/**
 * UI utilities and modal functions for CrazyCart
 * Handles modals, tooltips, and other UI components
 */

// Modal utilities
class Modal {
  constructor(options = {}) {
    this.options = {
      backdrop: true,
      keyboard: true,
      focus: true,
      ...options,
    };
    this.element = null;
    this.isOpen = false;
  }

  create(content) {
    this.element = document.createElement("div");
    this.element.className =
      "fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 modal-backdrop";
    this.element.innerHTML = content;

    // Handle backdrop click
    if (this.options.backdrop) {
      this.element.addEventListener("click", (e) => {
        if (e.target === this.element) {
          this.close();
        }
      });
    }

    // Handle escape key
    if (this.options.keyboard) {
      this.escapeHandler = (e) => {
        if (e.key === "Escape") {
          this.close();
        }
      };
      document.addEventListener("keydown", this.escapeHandler);
    }

    return this.element;
  }

  show(content) {
    if (this.isOpen) return;

    this.create(content);
    document.body.appendChild(this.element);

    // Focus management
    if (this.options.focus) {
      const focusableElement = this.element.querySelector(
        "input, button, textarea, select"
      );
      if (focusableElement) {
        focusableElement.focus();
      }
    }

    this.isOpen = true;

    // Add animation
    requestAnimationFrame(() => {
      this.element.style.opacity = "1";
    });
  }

  close() {
    if (!this.isOpen || !this.element) return;

    this.element.style.opacity = "0";

    setTimeout(() => {
      if (this.element && this.element.parentNode) {
        this.element.parentNode.removeChild(this.element);
      }

      if (this.escapeHandler) {
        document.removeEventListener("keydown", this.escapeHandler);
      }

      this.isOpen = false;
      this.element = null;
    }, 200);
  }
}

// Confirmation dialog
function showConfirmDialog(message, onConfirm, onCancel = null) {
  const modal = new Modal();
  const content = `
    <div class="bg-white rounded-lg p-6 w-full max-w-md">
      <div class="flex items-center justify-center w-12 h-12 mx-auto mb-4 bg-yellow-100 rounded-full">
        <svg class="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z"></path>
        </svg>
      </div>
      <h3 class="text-xl font-bold text-center mb-4 text-gray-900">Confirm Action</h3>
      <p class="text-center text-gray-600 mb-6">${message}</p>
      <div class="flex justify-center space-x-4">
        <button type="button" class="cancel-btn px-6 py-2 text-gray-600 bg-gray-200 rounded-lg hover:bg-gray-300 transition-colors">
          Cancel
        </button>
        <button type="button" class="confirm-btn px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
          Confirm
        </button>
      </div>
    </div>
  `;

  modal.show(content);

  // Handle buttons
  const confirmBtn = modal.element.querySelector(".confirm-btn");
  const cancelBtn = modal.element.querySelector(".cancel-btn");

  confirmBtn.addEventListener("click", () => {
    modal.close();
    if (onConfirm) onConfirm();
  });

  cancelBtn.addEventListener("click", () => {
    modal.close();
    if (onCancel) onCancel();
  });

  return modal;
}

// Alert dialog
function showAlert(message, type = "info") {
  const modal = new Modal();

  let iconColor, iconPath;
  switch (type) {
    case "success":
      iconColor = "text-green-600";
      iconPath = "M5 13l4 4L19 7";
      break;
    case "error":
      iconColor = "text-red-600";
      iconPath = "M6 18L18 6M6 6l12 12";
      break;
    case "warning":
      iconColor = "text-yellow-600";
      iconPath =
        "M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z";
      break;
    default:
      iconColor = "text-blue-600";
      iconPath = "M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z";
  }

  const content = `
    <div class="bg-white rounded-lg p-6 w-full max-w-md">
      <div class="flex items-center justify-center w-12 h-12 mx-auto mb-4 bg-gray-100 rounded-full">
        <svg class="w-6 h-6 ${iconColor}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="${iconPath}"></path>
        </svg>
      </div>
      <h3 class="text-xl font-bold text-center mb-4 text-gray-900">Alert</h3>
      <p class="text-center text-gray-600 mb-6">${message}</p>
      <div class="flex justify-center">
        <button type="button" class="ok-btn px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
          OK
        </button>
      </div>
    </div>
  `;

  modal.show(content);

  const okBtn = modal.element.querySelector(".ok-btn");
  okBtn.addEventListener("click", () => modal.close());

  return modal;
}

// Loading spinner
function showLoading(message = "Loading...") {
  const modal = new Modal({ backdrop: false, keyboard: false });
  const content = `
    <div class="bg-white rounded-lg p-6 w-full max-w-sm text-center">
      <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
      <p class="text-gray-600">${message}</p>
    </div>
  `;

  modal.show(content);
  return modal;
}

// Tooltip functionality
function initializeTooltips() {
  const tooltipElements = document.querySelectorAll("[data-tooltip]");

  tooltipElements.forEach((element) => {
    let tooltip = null;

    element.addEventListener("mouseenter", () => {
      const text = element.getAttribute("data-tooltip");
      if (!text) return;

      tooltip = document.createElement("div");
      tooltip.className =
        "absolute bg-gray-800 text-white text-sm rounded py-1 px-2 z-50 tooltip";
      tooltip.textContent = text;

      document.body.appendChild(tooltip);

      // Position tooltip
      const rect = element.getBoundingClientRect();
      tooltip.style.left =
        rect.left + rect.width / 2 - tooltip.offsetWidth / 2 + "px";
      tooltip.style.top = rect.top - tooltip.offsetHeight - 5 + "px";
    });

    element.addEventListener("mouseleave", () => {
      if (tooltip) {
        tooltip.remove();
        tooltip = null;
      }
    });
  });
}

// Dropdown functionality
function initializeDropdowns() {
  const dropdowns = document.querySelectorAll(".dropdown");

  dropdowns.forEach((dropdown) => {
    const trigger = dropdown.querySelector(".dropdown-trigger");
    const menu = dropdown.querySelector(".dropdown-menu");

    if (!trigger || !menu) return;

    trigger.addEventListener("click", (e) => {
      e.stopPropagation();

      // Close other dropdowns
      dropdowns.forEach((other) => {
        if (other !== dropdown) {
          other.querySelector(".dropdown-menu")?.classList.add("hidden");
        }
      });

      menu.classList.toggle("hidden");
    });
  });

  // Close dropdowns when clicking outside
  document.addEventListener("click", () => {
    dropdowns.forEach((dropdown) => {
      dropdown.querySelector(".dropdown-menu")?.classList.add("hidden");
    });
  });
}

// Initialize UI components
function initializeUI() {
  console.log("Initializing UI components");
  initializeTooltips();
  initializeDropdowns();
}

// Auto-initialize when DOM is loaded
document.addEventListener("DOMContentLoaded", initializeUI);

// Export functions to both the CrazyCartUI namespace and globally
window.CrazyCartUI = {
  Modal,
  showConfirmDialog,
  showAlert,
  showLoading,
  initializeTooltips,
  initializeDropdowns,
  initializeUI,
};

// Also make them available globally for easier access
window.showConfirmDialog = showConfirmDialog;
window.showAlert = showAlert;
window.showLoading = showLoading;
