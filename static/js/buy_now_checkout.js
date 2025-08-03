document.addEventListener("DOMContentLoaded", function () {
  console.log("=== BUY NOW CHECKOUT INITIALIZED ===");

  const buyNowBtn = document.getElementById("buy-now-payment-btn");
  const loadingModal = document.getElementById("loading-modal");

  console.log("Buy now button:", buyNowBtn);
  console.log("Loading modal:", loadingModal);

  if (!buyNowBtn) {
    console.error("ERROR: buy-now-payment-btn not found");
    return;
  }

  if (!loadingModal) {
    console.error("ERROR: loading-modal not found");
    return;
  }

  buyNowBtn.addEventListener("click", function () {
    console.log("=== BUY NOW BUTTON CLICKED ===");
    console.log("Button data attributes:", {
      processUrl: buyNowBtn.dataset.processUrl,
      successUrl: buyNowBtn.dataset.successUrl,
    });

    // Validate URLs
    if (!buyNowBtn.dataset.processUrl) {
      console.error("ERROR: Missing processUrl data attribute");
      showNotification("Configuration error: Missing process URL", "error");
      return;
    }

    if (!buyNowBtn.dataset.successUrl) {
      console.error("ERROR: Missing successUrl data attribute");
      showNotification("Configuration error: Missing success URL", "error");
      return;
    }

    // Show loading modal
    console.log("Showing loading modal...");
    loadingModal.classList.remove("hidden");
    loadingModal.classList.add("flex");

    // Disable button
    this.disabled = true;
    this.innerHTML =
      '<div class="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>Processing...';

    // Get CSRF token
    const csrfToken =
      document.querySelector("[name=csrfmiddlewaretoken]")?.value ||
      document
        .querySelector("meta[name=csrf-token]")
        ?.getAttribute("content") ||
      getCookie("csrftoken");

    console.log("CSRF token found:", !!csrfToken);

    if (!csrfToken) {
      console.error("ERROR: No CSRF token found");
      hideLoadingModal();
      resetButton();
      showNotification("Security error: CSRF token missing", "error");
      return;
    }

    console.log("Making request to:", buyNowBtn.dataset.processUrl);

    // Process payment
    fetch(buyNowBtn.dataset.processUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-CSRFToken": csrfToken,
      },
      body: JSON.stringify({}),
    })
      .then((response) => {
        console.log("Response received:", response.status, response.statusText);

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        return response.text().then((text) => {
          console.log("Raw response:", text);
          try {
            return JSON.parse(text);
          } catch (e) {
            console.error("Response is not valid JSON:", text);
            throw new Error("Server returned invalid response");
          }
        });
      })
      .then((data) => {
        console.log("Parsed response data:", data);

        hideLoadingModal();

        if (data.success) {
          console.log(
            "Payment successful, redirecting to:",
            buyNowBtn.dataset.successUrl + "?order=" + data.order_number
          );

          showNotification("Payment successful! Redirecting...", "success");

          // Redirect to success page
          setTimeout(() => {
            window.location.href =
              buyNowBtn.dataset.successUrl + "?order=" + data.order_number;
          }, 1000);
        } else {
          console.error("Payment failed:", data.message);
          console.error("Debug info:", data.debug_info);

          // Show detailed error message for debugging
          let errorMessage = data.message || "Payment failed";
          if (data.debug_info) {
            console.error("Error type:", data.debug_info.error_type);
            console.error("Error details:", data.debug_info.error_message);
          }

          showNotification(errorMessage, "error");

          // Re-enable button
          resetButton();
        }
      })
      .catch((error) => {
        console.error("Fetch error:", error);

        hideLoadingModal();
        resetButton();

        let errorMessage = "An error occurred. Please try again.";

        if (error.message.includes("HTTP error! status: 500")) {
          errorMessage = "Server error. Please try again later.";
        } else if (error.message.includes("HTTP error! status: 403")) {
          errorMessage =
            "Permission denied. Please refresh the page and try again.";
        } else if (error.message.includes("HTTP error! status: 404")) {
          errorMessage = "Service not found. Please contact support.";
        }

        showNotification(errorMessage, "error");
      });
  });

  function hideLoadingModal() {
    console.log("Hiding loading modal...");
    loadingModal.classList.add("hidden");
    loadingModal.classList.remove("flex");
  }

  function resetButton() {
    console.log("Resetting button...");
    if (buyNowBtn) {
      buyNowBtn.disabled = false;
      buyNowBtn.innerHTML = `
                <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path>
                </svg>
                Complete Purchase
            `;
    }
  }

  // Get cookie function
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
});

// Notification function
function showNotification(message, type = "info") {
  const notification = document.createElement("div");
  notification.className = `fixed top-4 right-4 p-4 rounded-lg shadow-lg z-50 ${
    type === "error"
      ? "bg-red-500 text-white"
      : type === "success"
      ? "bg-green-500 text-white"
      : "bg-blue-500 text-white"
  }`;
  notification.textContent = message;

  document.body.appendChild(notification);

  setTimeout(() => {
    notification.style.opacity = "0";
    setTimeout(() => {
      document.body.removeChild(notification);
    }, 300);
  }, 5000);
}
