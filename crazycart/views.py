from django.shortcuts import render
from products.models import Product, Category
from django.db.models import Q, Count

def home_view(request):
    """
    Home page view that displays featured products and categories
    """
    # Get featured products (latest 6 products)
    featured_products = Product.objects.filter(
        is_active=True,
        stock_quantity__gt=0
    ).select_related('category', 'seller').order_by('-created_at')[:6]
    
    # Get categories for the category section
    categories = Category.objects.filter(is_active=True)[:8]
    
    context = {
        'featured_products': featured_products,
        'categories': categories,
    }
    
    return render(request, 'index.html', context)
