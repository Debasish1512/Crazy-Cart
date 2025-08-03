/**
 * Product Detail Page JavaScript
 * Handles product image gallery, tabs, and product-specific interactions
 * Depends on: common.js, product.js, cart.js, wishlist.js, ui.js
 */

// Wait for DOM and all modules to be loaded
document.addEventListener("DOMContentLoaded", function () {
  initializeProductDetail();
});

function initializeProductDetail() {
  // Initialize all functionality
  initImageGallery();
  initProductTabs();
  initProductActions();
}

/**
 * Product Image Gallery
 */
function initImageGallery() {
  // Add click handlers for thumbnail images
  const thumbnailImages = document.querySelectorAll(
    '[onclick*="changeMainImage"]'
  );

  thumbnailImages.forEach((thumbnail) => {
    // Remove inline onclick and add proper event listener
    const imageUrl = thumbnail.getAttribute("onclick").match(/'([^']+)'/)[1];
    thumbnail.removeAttribute("onclick");

    thumbnail.addEventListener("click", function () {
      changeMainImage(imageUrl);
    });
  });
}

function changeMainImage(imageUrl) {
  const mainImage = document.getElementById("main-image");
  if (mainImage) {
    // Add fade effect
    mainImage.style.opacity = "0.5";

    setTimeout(() => {
      mainImage.src = imageUrl;
      mainImage.style.opacity = "1";
    }, 150);
  }
}

/**
 * Product Information Tabs
 */
function initProductTabs() {
  const tabButtons = document.querySelectorAll(".tab-button");
  const tabContents = document.querySelectorAll(".tab-content");

  tabButtons.forEach((button) => {
    button.addEventListener("click", function () {
      const tabName = this.getAttribute("data-tab");
      switchTab(tabName, tabButtons, tabContents);
    });
  });
}

function switchTab(tabName, tabButtons, tabContents) {
  // Remove active classes from all tabs
  tabButtons.forEach((btn) => {
    btn.classList.remove("border-blue-500", "text-blue-600");
    btn.classList.add("border-transparent", "text-gray-500");
  });

  // Hide all tab contents
  tabContents.forEach((content) => {
    content.classList.add("hidden");
  });

  // Activate selected tab
  const activeButton = document.querySelector(`[data-tab="${tabName}"]`);
  if (activeButton) {
    activeButton.classList.remove("border-transparent", "text-gray-500");
    activeButton.classList.add("border-blue-500", "text-blue-600");
  }

  // Show selected tab content
  const activeContent = document.getElementById(tabName + "-tab");
  if (activeContent) {
    activeContent.classList.remove("hidden");
  }
}

/**
 * Product Actions Integration
 */
function initProductActions() {
  // Add to cart button
  const addToCartBtn = document.querySelector(".add-to-cart");
  if (addToCartBtn && typeof window.ProductActions !== "undefined") {
    addToCartBtn.addEventListener("click", function () {
      const productId = this.getAttribute("data-product-id");
      window.ProductActions.addToCart(productId);
    });
  }

  // Wishlist toggle button
  const wishlistBtn = document.querySelector(".toggle-wishlist");
  if (wishlistBtn && typeof window.WishlistActions !== "undefined") {
    wishlistBtn.addEventListener("click", function () {
      const productId = this.getAttribute("data-product-id");
      window.WishlistActions.toggleWishlist(productId);
    });
  }

  // Bargaining button
  const bargainBtn = document.querySelector(".bargain-button");
  if (bargainBtn && typeof window.UIComponents !== "undefined") {
    bargainBtn.addEventListener("click", function () {
      const productId = this.getAttribute("data-product-id");
      const originalPrice = this.getAttribute("data-original-price");
      window.UIComponents.showBargainModal(productId, originalPrice);
    });
  }
}

/**
 * Zoom functionality for main image (optional enhancement)
 */
function initImageZoom() {
  const mainImage = document.getElementById("main-image");
  if (!mainImage) return;

  mainImage.addEventListener("mouseover", function () {
    this.style.cursor = "zoom-in";
  });

  mainImage.addEventListener("click", function () {
    openImageModal(this.src);
  });
}

function openImageModal(imageSrc) {
  // Create modal for image zoom
  const modal = document.createElement("div");
  modal.className =
    "fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50";
  modal.innerHTML = `
        <div class="relative max-w-4xl max-h-full p-4">
            <img src="${imageSrc}" alt="Product Image" class="max-w-full max-h-full object-contain">
            <button class="absolute top-4 right-4 text-white text-2xl hover:text-gray-300" onclick="this.closest('.fixed').remove()">
                &times;
            </button>
        </div>
    `;

  // Close modal on background click
  modal.addEventListener("click", function (e) {
    if (e.target === modal) {
      modal.remove();
    }
  });

  document.body.appendChild(modal);
}

/**
 * Product Rating and Reviews
 */
function initReviewSystem() {
  // Add review form handling if needed
  const reviewForm = document.getElementById("review-form");
  if (reviewForm) {
    reviewForm.addEventListener("submit", submitReview);
  }

  // Star rating interactive functionality
  const starRatings = document.querySelectorAll(".star-rating");
  starRatings.forEach((rating) => {
    initStarRating(rating);
  });
}

function submitReview(e) {
  e.preventDefault();

  const formData = new FormData(e.target);
  const productId = formData.get("product_id");

  fetch(`/products/${productId}/review/`, {
    method: "POST",
    body: formData,
    headers: {
      "X-CSRFToken": window.CommonUtils.getCSRFToken(),
    },
  })
    .then((response) => response.json())
    .then((data) => {
      if (data.success) {
        window.CommonUtils.showNotification(
          "Review submitted successfully!",
          "success"
        );
        location.reload(); // Refresh to show new review
      } else {
        window.CommonUtils.showNotification(
          data.message || "Error submitting review",
          "error"
        );
      }
    })
    .catch((error) => {
      console.error("Error submitting review:", error);
      window.CommonUtils.showNotification("Error submitting review", "error");
    });
}

function initStarRating(ratingElement) {
  const stars = ratingElement.querySelectorAll(".star");
  let currentRating = 0;

  stars.forEach((star, index) => {
    star.addEventListener("mouseover", function () {
      highlightStars(stars, index + 1);
    });

    star.addEventListener("mouseout", function () {
      highlightStars(stars, currentRating);
    });

    star.addEventListener("click", function () {
      currentRating = index + 1;
      const ratingInput = ratingElement.querySelector('input[name="rating"]');
      if (ratingInput) {
        ratingInput.value = currentRating;
      }
      highlightStars(stars, currentRating);
    });
  });
}

function highlightStars(stars, rating) {
  stars.forEach((star, index) => {
    if (index < rating) {
      star.classList.add("text-yellow-400");
      star.classList.remove("text-gray-300");
    } else {
      star.classList.add("text-gray-300");
      star.classList.remove("text-yellow-400");
    }
  });
}

/**
 * Related Products Carousel (optional enhancement)
 */
function initRelatedProductsCarousel() {
  const relatedProductsContainer = document.querySelector(
    ".related-products-grid"
  );
  if (!relatedProductsContainer) return;

  // Add navigation arrows if there are many products
  const products = relatedProductsContainer.children;
  if (products.length > 4) {
    addCarouselNavigation(relatedProductsContainer);
  }
}

function addCarouselNavigation(container) {
  const wrapper = document.createElement("div");
  wrapper.className = "relative";
  container.parentNode.insertBefore(wrapper, container);
  wrapper.appendChild(container);

  // Add navigation buttons
  const prevBtn = document.createElement("button");
  prevBtn.innerHTML = "‹";
  prevBtn.className =
    "absolute left-0 top-1/2 transform -translate-y-1/2 bg-white shadow-lg rounded-full w-10 h-10 flex items-center justify-center text-2xl text-gray-600 hover:text-gray-800 z-10";

  const nextBtn = document.createElement("button");
  nextBtn.innerHTML = "›";
  nextBtn.className =
    "absolute right-0 top-1/2 transform -translate-y-1/2 bg-white shadow-lg rounded-full w-10 h-10 flex items-center justify-center text-2xl text-gray-600 hover:text-gray-800 z-10";

  wrapper.appendChild(prevBtn);
  wrapper.appendChild(nextBtn);

  // Add scroll functionality
  let scrollPosition = 0;
  const scrollAmount = 300;

  nextBtn.addEventListener("click", () => {
    scrollPosition += scrollAmount;
    container.scrollTo({
      left: scrollPosition,
      behavior: "smooth",
    });
  });

  prevBtn.addEventListener("click", () => {
    scrollPosition -= scrollAmount;
    if (scrollPosition < 0) scrollPosition = 0;
    container.scrollTo({
      left: scrollPosition,
      behavior: "smooth",
    });
  });
}

// Export functions for global access
window.ProductDetailPage = {
  changeMainImage,
  switchTab,
  openImageModal,
  initImageZoom,
  initReviewSystem,
};
