// Checkout functionality
let checkoutData = {};

function initializeCheckout(data) {
  checkoutData = data;
  console.log("Checkout initialized with data:", checkoutData);
}

function showWalletConfirmationModal(form, button) {
  console.log("=== SHOW WALLET MODAL ===");
  console.log("Form:", form);
  console.log("Button:", button);

  const modal = document.getElementById("walletModal");
  console.log("Modal element:", modal);

  if (!modal) {
    console.error("ERROR: walletModal element not found");
    alert("Error: Payment confirmation modal not found. Please try again.");
    return;
  }

  modal.classList.remove("hidden");
  console.log("Modal shown, classes after show:", modal.className);

  // Store references for use in modal handlers
  modal.form = form;
  modal.button = button;
  console.log("Modal references stored successfully");
}

function hideWalletConfirmationModal() {
  console.log("=== HIDE WALLET MODAL ===");
  const modal = document.getElementById("walletModal");

  if (!modal) {
    console.error("ERROR: walletModal element not found");
    return;
  }

  modal.classList.add("hidden");
  console.log("Modal hidden, classes after hide:", modal.className);

  // Re-enable button if cancelled
  if (modal.button) {
    modal.button.disabled = false;
    modal.button.textContent = `Place Order - ৳${checkoutData.totalPrice}`;
    console.log("Button re-enabled");
  }
}

function processCheckout() {
  console.log("=== PROCESS CHECKOUT CALLED ===");
  console.log("Event object:", event);
  console.log("Checkout data:", checkoutData);

  const selectedPaymentMethod = document.querySelector(
    'input[name="payment_method"]:checked'
  );
  console.log("Selected payment method:", selectedPaymentMethod?.value);

  if (!selectedPaymentMethod) {
    console.log("ERROR: No payment method selected");
    alert("Please select a payment method");
    return;
  }

  const form = document.getElementById("checkout-form");
  console.log("Form found:", !!form);
  console.log("Form element:", form);

  if (!form) {
    console.error("ERROR: Checkout form not found");
    alert(
      "Error: Checkout form not found. Please refresh the page and try again."
    );
    return;
  }

  // Validate required fields
  const requiredFields = form.querySelectorAll(
    "input[required], textarea[required], select[required]"
  );
  console.log("Required fields count:", requiredFields.length);
  console.log(
    "Required fields:",
    Array.from(requiredFields).map((f) => f.name)
  );
  let isValid = true;

  requiredFields.forEach((field) => {
    if (!field.value.trim()) {
      console.log("INVALID FIELD:", field.name, "Value:", field.value);
      field.focus();
      field.classList.add("border-red-500");
      isValid = false;
      return;
    } else {
      field.classList.remove("border-red-500");
      console.log("VALID FIELD:", field.name, "Value:", field.value);
    }
  });

  if (!isValid) {
    console.log("ERROR: Form validation failed");
    alert("Please fill in all required fields");
    return;
  }

  const paymentMethod = selectedPaymentMethod.value;
  const button = event.target;

  console.log("=== PROCESSING PAYMENT ===");
  console.log("Payment method:", paymentMethod);
  console.log("Button element:", button);

  button.disabled = true;
  button.textContent = "Processing...";

  // Remove any existing payment method inputs
  const existingPaymentInputs = form.querySelectorAll(
    'input[name="payment_method"]'
  );
  existingPaymentInputs.forEach((input) => {
    if (input.type === "hidden") {
      input.remove();
    }
  });

  // Add payment method to form
  const paymentInput = document.createElement("input");
  paymentInput.type = "hidden";
  paymentInput.name = "payment_method";
  paymentInput.value = paymentMethod;
  form.appendChild(paymentInput);
  console.log("Added payment method input to form:", paymentMethod);

  if (paymentMethod === "crazycart_wallet") {
    console.log("=== WALLET PAYMENT PROCESSING ===");
    // Check wallet balance
    const walletBalance = parseFloat(checkoutData.walletBalance || 0);
    const totalAmount = parseFloat(checkoutData.totalPrice || 0);

    console.log("Wallet balance check:");
    console.log("- User wallet balance:", walletBalance);
    console.log("- Total amount:", totalAmount);
    console.log("- Sufficient balance:", walletBalance >= totalAmount);

    if (walletBalance < totalAmount) {
      console.log("ERROR: Insufficient wallet balance");
      alert(
        "Insufficient wallet balance. Please add money to your wallet or choose another payment method."
      );
      button.disabled = false;
      button.textContent = `Place Order - ৳${checkoutData.totalPrice}`;
      return;
    }

    console.log("Attempting to show wallet confirmation modal...");
    try {
      showWalletConfirmationModal(form, button);
      console.log("Wallet modal shown successfully");
    } catch (error) {
      console.error("ERROR showing wallet modal:", error);
      alert("Error showing payment confirmation. Please try again.");
      button.disabled = false;
      button.textContent = `Place Order - ৳${checkoutData.totalPrice}`;
    }
  } else if (paymentMethod === "cash_on_delivery") {
    console.log("=== CASH ON DELIVERY PROCESSING ===");
    console.log("Using native confirm dialog");
    if (confirm("Place order with Cash on Delivery?")) {
      console.log("COD confirmed via native dialog, submitting form");
      try {
        form.submit();
        console.log("Form submitted successfully");
      } catch (error) {
        console.error("ERROR submitting form:", error);
        alert("Error submitting order. Please try again.");
        button.disabled = false;
        button.textContent = `Place Order - ৳${checkoutData.totalPrice}`;
      }
    } else {
      console.log("COD cancelled via native dialog");
      button.disabled = false;
      button.textContent = `Place Order - ৳${checkoutData.totalPrice}`;
    }
  } else if (paymentMethod === "online_payment") {
    console.log("=== ONLINE PAYMENT PROCESSING ===");
    // For online payment, we'll redirect to a payment gateway
    const newAction = checkoutData.onlineCheckoutUrl;
    console.log("Changing form action from:", form.action);
    console.log("Changing form action to:", newAction);
    form.action = newAction;
    console.log("Form action after change:", form.action);

    try {
      form.submit();
      console.log("Online payment form submitted successfully");
    } catch (error) {
      console.error("ERROR submitting online payment form:", error);
      alert("Error processing online payment. Please try again.");
      button.disabled = false;
      button.textContent = `Place Order - ৳${checkoutData.totalPrice}`;
    }
  } else {
    console.error("ERROR: Unknown payment method:", paymentMethod);
    alert("Invalid payment method selected. Please try again.");
    button.disabled = false;
    button.textContent = `Place Order - ৳${checkoutData.totalPrice}`;
  }
}

// Auto-select appropriate payment method based on wallet balance
function initializePaymentMethods() {
  console.log("Initializing payment methods");
  const walletBalance = parseFloat(checkoutData.walletBalance || 0);
  const totalAmount = parseFloat(checkoutData.totalPrice || 0);

  console.log("Wallet balance:", walletBalance, "Total amount:", totalAmount);

  const walletRadio = document.querySelector('input[value="crazycart_wallet"]');
  const onlineRadio = document.querySelector('input[value="online_payment"]');

  if (walletBalance >= totalAmount && walletRadio) {
    walletRadio.checked = true;
    console.log("Selected wallet payment (sufficient balance)");
  } else if (onlineRadio) {
    onlineRadio.checked = true;
    console.log("Selected online payment (insufficient wallet balance)");
  }
}

function setupModalEventListeners() {
  console.log("Setting up modal event listeners");

  const confirmWalletButton = document.getElementById("confirmWalletPayment");
  const cancelWalletButton = document.getElementById("cancelWalletPayment");
  const walletModal = document.getElementById("walletModal");

  console.log("Confirm button:", confirmWalletButton);
  console.log("Cancel button:", cancelWalletButton);
  console.log("Wallet modal:", walletModal);

  if (confirmWalletButton) {
    confirmWalletButton.addEventListener("click", function () {
      console.log("=== WALLET PAYMENT CONFIRMED ===");
      const modal = document.getElementById("walletModal");
      if (modal && modal.form) {
        console.log("Submitting form:", modal.form);
        try {
          modal.form.submit();
          console.log("Form submitted successfully");
        } catch (error) {
          console.error("ERROR submitting form:", error);
          alert("Error submitting payment. Please try again.");
        }
      } else {
        console.error("ERROR: Modal or form not found");
        alert("Error: Payment form not found. Please try again.");
      }
      hideWalletConfirmationModal();
    });
  } else {
    console.error("ERROR: confirmWalletPayment button not found");
  }

  if (cancelWalletButton) {
    cancelWalletButton.addEventListener("click", function () {
      console.log("=== WALLET PAYMENT CANCELLED ===");
      hideWalletConfirmationModal();
    });
  } else {
    console.error("ERROR: cancelWalletPayment button not found");
  }

  // Close modal when clicking outside
  if (walletModal) {
    walletModal.addEventListener("click", function (e) {
      if (e.target === this) {
        hideWalletConfirmationModal();
      }
    });
  }

  // Close modal with Escape key
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") {
      const modal = document.getElementById("walletModal");
      if (modal && !modal.classList.contains("hidden")) {
        hideWalletConfirmationModal();
      }
    }
  });
}

// Initialize checkout when DOM is loaded
document.addEventListener("DOMContentLoaded", function () {
  console.log("Checkout DOM loaded, waiting for initialization...");

  // Setup modal event listeners
  setupModalEventListeners();

  // The initializeCheckout function will be called from the template
  // with the necessary data
});

// Utility function for getting cookies
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

// Export functions for global access
window.processCheckout = processCheckout;
window.showWalletConfirmationModal = showWalletConfirmationModal;
window.hideWalletConfirmationModal = hideWalletConfirmationModal;
window.initializeCheckout = initializeCheckout;
window.initializePaymentMethods = initializePaymentMethods;
