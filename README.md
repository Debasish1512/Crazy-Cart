# CrazyCart JavaScript Module Structure

This document explains the new modular JavaScript structure for the CrazyCart application.

## File Structure

```
static/js/
├── common.js          # Common utilities and CSRF handling
├── ui.js              # UI components (modals, tooltips, dropdowns)
├── cart.js            # Cart functionality
├── wishlist.js        # Wishlist functionality
├── product.js         # Product interactions (gallery, bargaining)
├── search.js          # Search and filtering
├── cart-page.js       # Cart page specific features
├── product-page.js    # Product page specific features
├── main-new.js        # Module coordinator and backward compatibility
└── main.js            # (Legacy - can be removed after testing)
```

## Module Description

### 1. common.js
**Purpose**: Core utilities used across all pages
**Functions**:
- `getCSRFToken()` - Retrieves CSRF token for AJAX requests
- `showNotification(message, type)` - Display toast notifications
- `formatPrice(price)` - Format prices in BDT currency
- `validateEmail(email)` - Email validation
- `validatePassword(password)` - Password validation (minimum 6 characters)
- `setupAlertAutoHide()` - Auto-hide alert messages

### 2. ui.js
**Purpose**: Reusable UI components and interactions
**Functions**:
- `Modal` class - Advanced modal management
- `showConfirmDialog(message, onConfirm, onCancel)` - Confirmation dialogs
- `showAlert(message, type)` - Alert dialogs
- `showLoading(message)` - Loading indicators
- `initializeTooltips()` - Tooltip functionality
- `initializeDropdowns()` - Dropdown menus

### 3. cart.js
**Purpose**: Shopping cart functionality
**Functions**:
- `addToCart(productId, quantity)` - Add items to cart
- `updateCartItem(cartItemId, quantity)` - Update cart quantities
- `updateCartCount(count)` - Update cart badge count
- `showClearCartModal(clearUrl)` - Clear cart confirmation
- `initializeCart()` - Initialize cart event listeners

### 4. wishlist.js
**Purpose**: Wishlist management
**Functions**:
- `toggleWishlist(productId, button)` - Add/remove from wishlist
- `updateWishlistButtonContent(button, isInWishlist)` - Update button states
- `removeFromWishlistPage(productId, button)` - Remove from wishlist page
- `initializeWishlist()` - Initialize wishlist event listeners

### 5. product.js
**Purpose**: Product-related interactions
**Functions**:
- `initializeImageGallery()` - Product image switching
- `showBargainModal(productId, originalPrice)` - Bargaining interface
- `initializeProduct()` - Initialize product event listeners

### 6. search.js
**Purpose**: Search functionality and suggestions
**Functions**:
- `fetchSearchSuggestions(query)` - Get search suggestions
- `displaySearchSuggestions(data)` - Show suggestion dropdown
- `hideSuggestions()` - Hide suggestion dropdown
- `initializeSearch()` - Initialize search functionality
- `initializeSearchFilters()` - Advanced filtering
- `updateSearchResults()` - Update filtered results

### 7. cart-page.js
**Purpose**: Cart page specific functionality
**Functions**:
- `initializeCartPage()` - Enhanced cart page features
- `applyDiscountCode(form)` - Apply discount codes
- `saveItemForLater(cartItemId)` - Save items for later

### 8. product-page.js
**Purpose**: Product detail page specific functionality
**Functions**:
- `initializeProductPage()` - Enhanced product page features
- `initializeImageZoom()` - Image zoom on hover
- `initializeVariantSelection()` - Product variants
- `initializeProductReviews()` - Review system
- `initializeSocialSharing()` - Social media sharing
- `initializeRelatedProductsCarousel()` - Related products carousel

### 9. main-new.js
**Purpose**: Module coordinator and backward compatibility
**Functions**:
- Global error handling
- Module coordination
- Backward compatibility layer

## Usage

### Including Scripts in Templates

In your `base.html` template:

```html
<!-- JavaScript Modules -->
<!-- Load modules in order: common utilities first, then specific functionality -->
<script src="{% static 'js/common.js' %}"></script>
<script src="{% static 'js/ui.js' %}"></script>
<script src="{% static 'js/cart.js' %}"></script>
<script src="{% static 'js/wishlist.js' %}"></script>
<script src="{% static 'js/product.js' %}"></script>
<script src="{% static 'js/search.js' %}"></script>
<script src="{% static 'js/main-new.js' %}"></script>
```

### Page-Specific Scripts

For pages that need additional functionality:

```html
<!-- In cart.html -->
{% block extra_js %}
<script src="{% static 'js/cart-page.js' %}"></script>
{% endblock %}

<!-- In product_detail.html -->
{% block extra_js %}
<script src="{% static 'js/product-page.js' %}"></script>
{% endblock %}
```

### Backward Compatibility

All functions are still available through the global `window.CrazyCartJS` object for backward compatibility:

```javascript
// These still work
window.CrazyCartJS.addToCart(productId, quantity);
window.CrazyCartJS.showNotification(message, type);
window.CrazyCartJS.toggleWishlist(productId, button);
```

### Direct Module Access

You can also access functions through their specific modules:

```javascript
// Direct module access
window.CrazyCartCommon.showNotification(message, type);
window.CrazyCartCart.addToCart(productId, quantity);
window.CrazyCartWishlist.toggleWishlist(productId, button);
```

## Benefits

1. **Better Organization**: Code is logically separated by functionality
2. **Easier Maintenance**: Changes to specific features only affect relevant files
3. **Better Performance**: Page-specific scripts only load when needed
4. **Modularity**: Functions can be reused across different modules
5. **Debugging**: Easier to locate and fix issues in specific areas
6. **Team Development**: Multiple developers can work on different modules simultaneously

## Migration Guide

1. **Current Setup**: All functionality is in `main.js`
2. **New Setup**: Functionality is split across multiple modules
3. **Testing**: Include both old and new scripts temporarily
4. **Verification**: Test all functionality works with new modules
5. **Cleanup**: Remove `main.js` and legacy references

## Error Handling

- Global error handling in `main-new.js`
- Module-specific error handling in each file
- Consistent error messaging through `showNotification()`
- CSRF token validation in all AJAX requests

## Performance Considerations

- Modules auto-initialize only relevant functionality
- Event listeners are scoped to prevent conflicts
- Page-specific scripts load conditionally
- Common utilities are shared to reduce duplication
