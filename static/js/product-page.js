/**
 * Product page specific JavaScript
 * Additional functionality for product detail pages
 */

// Initialize product page specific functionality
function initializeProductPage() {
  console.log("Initializing product page functionality");

  // Product image zoom functionality
  initializeImageZoom();

  // Product variant selection
  initializeVariantSelection();

  // Product reviews
  initializeProductReviews();

  // Social sharing
  initializeSocialSharing();

  // Related products carousel
  initializeRelatedProductsCarousel();
}

function initializeImageZoom() {
  const mainImage = document.querySelector(".product-main-image");
  if (!mainImage) return;

  let zoomOverlay = null;

  mainImage.addEventListener("mouseenter", function () {
    if (window.innerWidth < 768) return; // Skip on mobile

    zoomOverlay = document.createElement("div");
    zoomOverlay.className = "absolute inset-0 cursor-zoom-in";
    zoomOverlay.style.backgroundImage = `url(${this.src})`;
    zoomOverlay.style.backgroundSize = "200%";
    zoomOverlay.style.backgroundRepeat = "no-repeat";
    zoomOverlay.style.opacity = "0";
    zoomOverlay.style.transition = "opacity 0.3s ease";

    this.parentElement.style.position = "relative";
    this.parentElement.appendChild(zoomOverlay);

    setTimeout(() => {
      zoomOverlay.style.opacity = "1";
    }, 10);
  });

  mainImage.addEventListener("mousemove", function (e) {
    if (!zoomOverlay) return;

    const rect = this.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;

    zoomOverlay.style.backgroundPosition = `${x}% ${y}%`;
  });

  mainImage.addEventListener("mouseleave", function () {
    if (zoomOverlay) {
      zoomOverlay.remove();
      zoomOverlay = null;
    }
  });
}

function initializeVariantSelection() {
  const variantSelectors = document.querySelectorAll(".variant-selector");

  variantSelectors.forEach((selector) => {
    selector.addEventListener("change", function () {
      updateProductVariant();
    });
  });
}

function updateProductVariant() {
  const selectedVariants = {};
  const variantSelectors = document.querySelectorAll(".variant-selector");

  variantSelectors.forEach((selector) => {
    selectedVariants[selector.name] = selector.value;
  });

  // Update price based on selected variants
  updateVariantPrice(selectedVariants);

  // Update availability
  updateVariantAvailability(selectedVariants);

  // Update main image if variant has specific image
  updateVariantImage(selectedVariants);
}

function updateVariantPrice(variants) {
  // Implementation would depend on your variant pricing structure
  console.log("Updating price for variants:", variants);
}

function updateVariantAvailability(variants) {
  // Implementation would check stock for specific variant combination
  console.log("Checking availability for variants:", variants);
}

function updateVariantImage(variants) {
  // Implementation would update main image based on selected variant
  console.log("Updating image for variants:", variants);
}

function initializeProductReviews() {
  // Review form submission
  const reviewForm = document.querySelector(".review-form");
  if (reviewForm) {
    reviewForm.addEventListener("submit", function (e) {
      e.preventDefault();
      submitProductReview(this);
    });
  }

  // Review sorting
  const reviewSort = document.querySelector(".review-sort");
  if (reviewSort) {
    reviewSort.addEventListener("change", function () {
      sortReviews(this.value);
    });
  }

  // Review voting (helpful/not helpful)
  const voteButtons = document.querySelectorAll(".review-vote");
  voteButtons.forEach((button) => {
    button.addEventListener("click", function (e) {
      e.preventDefault();
      const { reviewId, voteType } = this.dataset;
      voteOnReview(reviewId, voteType);
    });
  });
}

function submitProductReview(form) {
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
        showNotification("Review submitted successfully!", "success");
        setTimeout(() => location.reload(), 1000);
      } else {
        showNotification(data.message || "Error submitting review", "error");
      }
    })
    .catch((error) => {
      console.error("Error submitting review:", error);
      showNotification("Error submitting review", "error");
    });
}

function sortReviews(sortBy) {
  const url = new URL(window.location);
  url.searchParams.set("review_sort", sortBy);
  window.location.href = url.toString();
}

function voteOnReview(reviewId, voteType) {
  const token = getCSRFToken();
  if (!token) {
    showNotification("Please refresh the page and try again.", "error");
    return;
  }

  fetch("/products/review/vote/", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-CSRFToken": token,
    },
    body: JSON.stringify({
      review_id: reviewId,
      vote_type: voteType,
    }),
  })
    .then((response) => response.json())
    .then((data) => {
      if (data.success) {
        // Update vote counts in UI
        updateReviewVoteCounts(
          reviewId,
          data.helpful_count,
          data.not_helpful_count
        );
      } else {
        showNotification(data.message || "Error voting on review", "error");
      }
    })
    .catch((error) => {
      console.error("Error voting on review:", error);
      showNotification("Error voting on review", "error");
    });
}

function updateReviewVoteCounts(reviewId, helpfulCount, notHelpfulCount) {
  const reviewElement = document.querySelector(
    `[data-review-id="${reviewId}"]`
  );
  if (reviewElement) {
    const helpfulCountElement = reviewElement.querySelector(".helpful-count");
    const notHelpfulCountElement =
      reviewElement.querySelector(".not-helpful-count");

    if (helpfulCountElement) helpfulCountElement.textContent = helpfulCount;
    if (notHelpfulCountElement)
      notHelpfulCountElement.textContent = notHelpfulCount;
  }
}

function initializeSocialSharing() {
  const shareButtons = document.querySelectorAll(".social-share");

  shareButtons.forEach((button) => {
    button.addEventListener("click", function (e) {
      e.preventDefault();
      const { platform } = this.dataset;
      shareOnSocialMedia(platform);
    });
  });
}

function shareOnSocialMedia(platform) {
  const url = encodeURIComponent(window.location.href);
  const title = encodeURIComponent(document.title);

  let shareUrl;

  switch (platform) {
    case "facebook":
      shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${url}`;
      break;
    case "twitter":
      shareUrl = `https://twitter.com/intent/tweet?url=${url}&text=${title}`;
      break;
    case "pinterest":
      const image = encodeURIComponent(
        document.querySelector(".product-main-image")?.src || ""
      );
      shareUrl = `https://pinterest.com/pin/create/button/?url=${url}&media=${image}&description=${title}`;
      break;
    case "whatsapp":
      shareUrl = `https://wa.me/?text=${title}%20${url}`;
      break;
    default:
      return;
  }

  window.open(shareUrl, "_blank", "width=600,height=400");
}

function initializeRelatedProductsCarousel() {
  const carousel = document.querySelector(".related-products-carousel");
  if (!carousel) return;

  const prevBtn = carousel.querySelector(".carousel-prev");
  const nextBtn = carousel.querySelector(".carousel-next");
  const track = carousel.querySelector(".carousel-track");

  if (!prevBtn || !nextBtn || !track) return;

  let currentPosition = 0;
  const itemWidth = track.querySelector(".carousel-item")?.offsetWidth || 0;
  const visibleItems = Math.floor(carousel.offsetWidth / itemWidth);
  const maxPosition = Math.max(0, track.children.length - visibleItems);

  prevBtn.addEventListener("click", () => {
    if (currentPosition > 0) {
      currentPosition--;
      updateCarouselPosition();
    }
  });

  nextBtn.addEventListener("click", () => {
    if (currentPosition < maxPosition) {
      currentPosition++;
      updateCarouselPosition();
    }
  });

  function updateCarouselPosition() {
    track.style.transform = `translateX(-${currentPosition * itemWidth}px)`;

    prevBtn.disabled = currentPosition === 0;
    nextBtn.disabled = currentPosition === maxPosition;
  }

  // Initialize button states
  updateCarouselPosition();
}

// Only initialize if we're on a product page
if (
  document.querySelector(".product-detail") ||
  document.querySelector(".product-main-image")
) {
  document.addEventListener("DOMContentLoaded", initializeProductPage);
}

// Export functions
window.CrazyCartProductPage = {
  initializeProductPage,
  initializeImageZoom,
  initializeVariantSelection,
  updateProductVariant,
  initializeProductReviews,
  submitProductReview,
  voteOnReview,
  initializeSocialSharing,
  shareOnSocialMedia,
  initializeRelatedProductsCarousel,
};
