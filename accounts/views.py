from django.shortcuts import render, redirect, get_object_or_404
from django.contrib.auth import login, logout, authenticate
from django.contrib.auth.decorators import login_required
from django.contrib import messages
from django.db import transaction
from .models import User, UserProfile, SellerProfile
from .forms import UserRegistrationForm, UserProfileForm, SellerProfileForm, UserUpdateForm

def login_view(request):
    if request.user.is_authenticated:
        return redirect('home')
    
    if request.method == 'POST':
        username = request.POST.get('username')
        password = request.POST.get('password')
        
        user = authenticate(request, username=username, password=password)
        if user:
            login(request, user)
            messages.success(request, f'Welcome back, {user.first_name or user.username}!')
            return redirect(request.GET.get('next', 'home'))
        else:
            messages.error(request, 'Invalid username or password.')
    
    return render(request, 'accounts/login.html')

def logout_view(request):
    logout(request)
    messages.success(request, 'You have been logged out successfully.')
    return redirect('home')

def signup_view(request):
    if request.user.is_authenticated:
        return redirect('home')
    
    if request.method == 'POST':
        form = UserRegistrationForm(request.POST)
        if form.is_valid():
            try:
                with transaction.atomic():
                    user = form.save()
                    # Give new users some initial CrazyCart Coins
                    user.crazycart_balance = 100.00
                    user.save()
                    
                    # Create user profile
                    UserProfile.objects.create(user=user)
                    
                    # Create seller profile if user type is seller
                    if user.user_type == 'seller':
                        SellerProfile.objects.create(
                            user=user,
                            business_name=f"{user.first_name}'s Store",
                            business_description="Welcome to my store!"
                        )
                    
                    login(request, user)
                    messages.success(request, f'Welcome to CrazyCart, {user.first_name}! You received 100 ৳ as a welcome bonus.')
                    return redirect('home')
            except Exception as e:
                messages.error(request, f'Error creating account: {str(e)}')
        else:
            # Form has validation errors
            for field, errors in form.errors.items():
                for error in errors:
                    messages.error(request, f'{field.title()}: {error}')
    else:
        form = UserRegistrationForm()
    
    return render(request, 'accounts/signup.html', {'form': form})

@login_required
def profile_view(request):
    try:
        profile = request.user.profile
    except UserProfile.DoesNotExist:
        profile = UserProfile.objects.create(user=request.user)
    
    return render(request, 'accounts/profile.html', {'profile': profile})

@login_required
def edit_profile_view(request):
    try:
        profile = request.user.profile
    except UserProfile.DoesNotExist:
        profile = UserProfile.objects.create(user=request.user)
    
    if request.method == 'POST':
        user_form = UserUpdateForm(request.POST, instance=request.user)
        profile_form = UserProfileForm(request.POST, request.FILES, instance=profile)
        
        if user_form.is_valid() and profile_form.is_valid():
            user_form.save()
            profile_form.save()
            messages.success(request, 'Profile updated successfully!')
            return redirect('accounts:profile')
    else:
        user_form = UserUpdateForm(instance=request.user)
        profile_form = UserProfileForm(instance=profile)
    
    return render(request, 'accounts/edit_profile.html', {
        'user_form': user_form,
        'profile_form': profile_form
    })

@login_required
def seller_profile_view(request):
    if request.user.user_type != 'seller':
        messages.error(request, 'Access denied. Seller account required.')
        return redirect('home')
    
    try:
        seller_profile = request.user.seller_profile
    except SellerProfile.DoesNotExist:
        seller_profile = SellerProfile.objects.create(
            user=request.user,
            business_name=f"{request.user.first_name}'s Store",
            business_description="Welcome to my store!"
        )
    
    return render(request, 'accounts/seller_profile.html', {'seller_profile': seller_profile})

@login_required
def seller_dashboard_view(request):
    if request.user.user_type != 'seller':
        messages.error(request, 'Access denied. Seller account required.')
        return redirect('home')
    
    # Get seller statistics
    products = request.user.products.all()
    total_products = products.count()
    active_products = products.filter(is_active=True).count()
    total_sales = request.user.sold_items.count()
    
    # Recent orders
    recent_orders = request.user.sold_items.select_related('order', 'product').order_by('-created_at')[:10]
    
    # Bargain requests
    bargain_requests = request.user.received_bargains.filter(status='pending').count()
    
    context = {
        'total_products': total_products,
        'active_products': active_products,
        'total_sales': total_sales,
        'recent_orders': recent_orders,
        'bargain_requests': bargain_requests,
    }
    
    return render(request, 'accounts/seller_dashboard.html', context)

@login_required
def admin_dashboard_view(request):
    if request.user.user_type != 'admin' and not request.user.is_staff:
        messages.error(request, 'Access denied. Admin account required.')
        return redirect('home')
    
    # Get admin statistics
    from products.models import Product, Category
    from orders.models import Order
    from bargaining.models import BargainRequest
    
    total_users = User.objects.count()
    total_products = Product.objects.count()
    total_orders = Order.objects.count()
    pending_bargains = BargainRequest.objects.filter(status='pending').count()
    
    # Recent activity
    recent_users = User.objects.order_by('-date_joined')[:5]
    recent_products = Product.objects.order_by('-created_at')[:5]
    recent_orders = Order.objects.order_by('-created_at')[:5]
    
    context = {
        'total_users': total_users,
        'total_products': total_products,
        'total_orders': total_orders,
        'pending_bargains': pending_bargains,
        'recent_users': recent_users,
        'recent_products': recent_products,
        'recent_orders': recent_orders,
    }
    
    return render(request, 'accounts/admin_dashboard.html', context)

def user_profile_public_view(request, username):
    user = get_object_or_404(User, username=username)
    
    # Only show public seller profiles
    if user.user_type != 'seller':
        messages.error(request, 'User profile not found.')
        return redirect('home')
    
    try:
        seller_profile = user.seller_profile
    except SellerProfile.DoesNotExist:
        messages.error(request, 'Seller profile not found.')
        return redirect('home')
    
    # Get seller's products
    products = user.products.filter(is_active=True).order_by('-created_at')[:12]
    
    context = {
        'seller': user,
        'seller_profile': seller_profile,
        'products': products,
    }
    
    return render(request, 'accounts/user_profile_public.html', context)
