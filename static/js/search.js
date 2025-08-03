/**
 * Search functionality for CrazyCart
 * Handles search suggestions and search-related features
 */

// Search suggestions functionality
function fetchSearchSuggestions(query) {
  fetch(`/products/search/?q=${encodeURIComponent(query)}&format=json`)
    .then((response) => response.json())
    .then((data) => {
      // Implement search suggestions dropdown if needed
      console.log("Search suggestions:", data);
      displaySearchSuggestions(data);
    })
    .catch((error) => {
      console.error("Search error:", error);
    });
}

function displaySearchSuggestions(data) {
  // Create or update search suggestions dropdown
  let dropdown = document.querySelector(".search-suggestions");

  if (!dropdown) {
    dropdown = document.createElement("div");
    dropdown.className =
      "search-suggestions absolute top-full left-0 right-0 bg-white shadow-lg rounded-b-lg max-h-64 overflow-y-auto z-50";

    const searchContainer =
      document.querySelector('input[name="q"]')?.parentElement;
    if (searchContainer) {
      searchContainer.style.position = "relative";
      searchContainer.appendChild(dropdown);
    }
  }

  // Clear existing suggestions
  dropdown.innerHTML = "";

  if (data && data.results && data.results.length > 0) {
    data.results.forEach((product) => {
      const suggestion = document.createElement("div");
      suggestion.className =
        "p-3 hover:bg-gray-100 cursor-pointer border-b border-gray-200 flex items-center";
      suggestion.innerHTML = `
        <div class="flex-shrink-0 w-12 h-12 mr-3">
          <img src="${product.image || "/static/images/placeholder.jpg"}" 
               alt="${product.name}" 
               class="w-full h-full object-cover rounded">
        </div>
        <div class="flex-grow">
          <div class="font-medium text-gray-900">${product.name}</div>
          <div class="text-sm text-gray-600">${formatPrice(product.price)}</div>
        </div>
      `;

      suggestion.addEventListener("click", () => {
        window.location.href = `/products/${product.slug}/`;
      });

      dropdown.appendChild(suggestion);
    });

    dropdown.style.display = "block";
  } else {
    dropdown.style.display = "none";
  }
}

function hideSuggestions() {
  const dropdown = document.querySelector(".search-suggestions");
  if (dropdown) {
    dropdown.style.display = "none";
  }
}

// Initialize search functionality
function initializeSearch() {
  console.log("Initializing search functionality");

  const searchInput = document.querySelector('input[name="q"]');
  if (searchInput) {
    let searchTimeout;

    searchInput.addEventListener("input", function () {
      clearTimeout(searchTimeout);
      searchTimeout = setTimeout(() => {
        const query = this.value.trim();
        if (query.length > 2) {
          fetchSearchSuggestions(query);
        } else {
          hideSuggestions();
        }
      }, 300);
    });

    // Hide suggestions when clicking outside
    document.addEventListener("click", function (e) {
      if (
        !e.target.closest(".search-suggestions") &&
        e.target !== searchInput
      ) {
        hideSuggestions();
      }
    });

    // Handle escape key
    searchInput.addEventListener("keydown", function (e) {
      if (e.key === "Escape") {
        hideSuggestions();
      }
    });
  }
}

// Advanced search filters
function initializeSearchFilters() {
  const filterForm = document.querySelector(".search-filters");
  if (!filterForm) return;

  const priceRange = filterForm.querySelector(".price-range");
  const categoryFilter = filterForm.querySelector(".category-filter");
  const sortBy = filterForm.querySelector(".sort-by");

  // Price range slider
  if (priceRange) {
    priceRange.addEventListener("change", debounce(updateSearchResults, 500));
  }

  // Category filter
  if (categoryFilter) {
    categoryFilter.addEventListener("change", updateSearchResults);
  }

  // Sort by
  if (sortBy) {
    sortBy.addEventListener("change", updateSearchResults);
  }
}

function updateSearchResults() {
  const form = document.querySelector(".search-filters");
  if (!form) return;

  const formData = new FormData(form);
  const params = new URLSearchParams(formData);

  // Update URL without page reload
  const newUrl = `${window.location.pathname}?${params.toString()}`;
  window.history.pushState({}, "", newUrl);

  // You could also reload the page or fetch results via AJAX
  window.location.reload();
}

// Utility function for debouncing
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

// Auto-initialize when DOM is loaded
document.addEventListener("DOMContentLoaded", initializeSearch);

// Export functions
window.CrazyCartSearch = {
  fetchSearchSuggestions,
  displaySearchSuggestions,
  hideSuggestions,
  initializeSearch,
  initializeSearchFilters,
  updateSearchResults,
};
