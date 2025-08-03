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

      console.log("Accepting counter offer for bargain:", bargainId);
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
          console.log("Response ok:", response.ok);
          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }
          return response.json();
        })
        .then((data) => {
          console.log("Response data:", data);
          if (data.success) {
            showAlert("Counter offer accepted successfully!", "success");
            setTimeout(() => location.reload(), 1000);
          } else {
            showAlert(
              data.message || "Failed to accept counter offer",
              "error"
            );
          }
        })
        .catch((error) => {
          console.error("Error:", error);
          showAlert(
            "An error occurred while accepting the counter offer",
            "error"
          );
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
        // Fallback to getting from cookie
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
          console.log("Response ok:", response.ok);
          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }
          return response.json();
        })
        .then((data) => {
          console.log("Response data:", data);
          if (data.success) {
            showAlert("Bargain accepted successfully!", "success");
            setTimeout(() => location.reload(), 1000);
          } else {
            showAlert(data.message || "Failed to accept bargain", "error");
          }
        })
        .catch((error) => {
          console.error("Error:", error);
          showAlert("An error occurred while accepting the bargain", "error");
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
            location.reload();
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
