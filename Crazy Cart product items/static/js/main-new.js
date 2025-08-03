/**
 * Main entry point for CrazyCart JavaScript
 * This file coordinates all the modular JavaScript files
 */

// Simple function availability checker for debugging
function checkFunctionAvailability() {
  const requiredFunctions = [
    'showCounterOfferModal', 
    'acceptBargain', 
    'rejectBargain', 
    'showAlert',
    'showConfirmDialog'
  ];
  
  console.log('Function availability check:');
  requiredFunctions.forEach(func => {
    const available = typeof window[func] === 'function';
    console.log(`${func}: ${available ? '✓ Available' : '✗ Missing'}`);
  });
}

// Main initialization
document.addEventListener("DOMContentLoaded", function () {
  console.log("CrazyCart JavaScript modules loaded");
  
  // Check if all required functions are available after a short delay
  setTimeout(checkFunctionAvailability, 1000);

  // All modules are auto-initialized through their own DOMContentLoaded listeners
  // This main file serves as a coordinator and can handle global initialization

  // Global error handling
  window.addEventListener("error", function (e) {
    console.error("Global error:", e.error);

    // Don't show notifications for missing function errors
    if (
      e.error &&
      e.error.message &&
      e.error.message.includes("is not defined")
    ) {
      console.warn("Function not available:", e.error.message);
      return;
    }

    if (window.CrazyCartCommon && window.CrazyCartCommon.showNotification) {
      window.CrazyCartCommon.showNotification(
        "An error occurred. Please try again.",
        "error"
      );
    }
  });

  // Global unhandled promise rejection handling
  window.addEventListener("unhandledrejection", function (e) {
    console.error("Unhandled promise rejection:", e.reason);
    if (window.CrazyCartCommon && window.CrazyCartCommon.showNotification) {
      window.CrazyCartCommon.showNotification(
        "An error occurred. Please try again.",
        "error"
      );
    }
  });
});

// Backward compatibility - expose all functions globally
window.addEventListener("load", function () {
  // Merge all module functions into a global CrazyCartJS object for backward compatibility
  window.CrazyCartJS = {
    // Common functions
    ...window.CrazyCartCommon,

    // Cart functions
    ...window.CrazyCartCart,

    // Wishlist functions
    ...window.CrazyCartWishlist,

    // Product functions
    ...window.CrazyCartProduct,

    // Search functions
    ...window.CrazyCartSearch,

    // UI functions
    ...window.CrazyCartUI,
  };

  console.log("CrazyCartJS global object created for backward compatibility");
});
