from django.shortcuts import render, get_object_or_404, redirect
from django.contrib.auth.decorators import login_required
from django.contrib import messages
from django.http import JsonResponse
from django.core.paginator import Paginator
from django.db.models import Q, Avg, Max
from .models import Product, Category, ProductReview, Wishlist, Discount, ProductImage
from .forms import ProductForm, ProductReviewForm


def product_list_view(request, category_slug=None):
    products = Product.objects.filter(is_active=True).select_related(
        "seller", "category"
    )

    # Filter by category if provided
    category = None
    if category_slug:
        category = get_object_or_404(Category, slug=category_slug, is_active=True)
        products = products.filter(category=category)

    # Search functionality
    query = request.GET.get("q")
    if query:
        products = products.filter(
            Q(name__icontains=query)
            | Q(description__icontains=query)
            | Q(brand__icontains=query)
        )

    # Filtering
    min_price = request.GET.get("min_price")
    max_price = request.GET.get("max_price")
    condition = request.GET.get("condition")

    if min_price:
        products = products.filter(price__gte=min_price)
    if max_price:
        products = products.filter(price__lte=max_price)
    if condition:
        products = products.filter(condition=condition)

    # Sorting
    sort_by = request.GET.get("sort", "-created_at")
    if sort_by in ["price", "-price", "name", "-name", "created_at", "-created_at"]:
        products = products.order_by(sort_by)

    # Pagination
    paginator = Paginator(products, 12)
    page_number = request.GET.get("page")
    page_obj = paginator.get_page(page_number)

    # Get all categories for sidebar
    categories = Category.objects.filter(is_active=True)

    context = {
        "page_obj": page_obj,
        "categories": categories,
        "current_category": category,
        "query": query,
        "sort_by": sort_by,
    }

    return render(request, "products/product_list.html", context)


def product_search_view(request):
    return product_list_view(request)


def product_detail_view(request, slug):
    product = get_object_or_404(Product, slug=slug, is_active=True)

    # Increment view count
    product.views_count += 1
    product.save(update_fields=["views_count"])

    # Get product reviews
    reviews = product.reviews.select_related("user").order_by("-created_at")

    # Get related products from the same category
    related_products = (
        Product.objects.filter(category=product.category, is_active=True)
        .exclude(id=product.id)
        .select_related("category")
        .prefetch_related("images")
        .order_by("-created_at", "?")[:8]
    )
    # Check if user has this in wishlist
    in_wishlist = False
    if request.user.is_authenticated:
        in_wishlist = Wishlist.objects.filter(
            user=request.user, product=product
        ).exists()

    context = {
        "product": product,
        "reviews": reviews,
        "related_products": related_products,
        "in_wishlist": in_wishlist,
    }

    return render(request, "products/product_detail.html", context)


@login_required
def add_product_view(request):
    if request.user.user_type != "seller":
        messages.error(request, "Only sellers can add products.")
        return redirect("home")

    if request.method == "POST":
        form = ProductForm(request.POST, request.FILES)
        if form.is_valid():
            product = form.save(commit=False)
            product.seller = request.user
            product.save()

            # Handle image uploads
            images = request.FILES.getlist("images")
            if images:
                for index, image in enumerate(images[:5]):  # Limit to 5 images
                    ProductImage.objects.create(
                        product=product,
                        image=image,
                        is_primary=(index == 0),  # First image is primary
                        order=index,
                    )

            messages.success(request, "Product added successfully!")
            return redirect("products:product_detail", slug=product.slug)
        else:
            # Check if there are image-related errors
            images = request.FILES.getlist("images")
            if not images:
                messages.error(request, "Please upload at least one product image.")
    else:
        form = ProductForm()

    return render(request, "products/add_product.html", {"form": form})


@login_required
def edit_product_view(request, slug):
    product = get_object_or_404(Product, slug=slug, seller=request.user)

    if request.method == "POST":
        form = ProductForm(request.POST, request.FILES, instance=product)
        if form.is_valid():
            form.save()

            # Handle new image uploads
            images = request.FILES.getlist("images")
            if images:
                # Get current max order for existing images
                existing_images = product.images.all()
                max_order = (
                    existing_images.aggregate(max_order=Max("order"))["max_order"] or -1
                )

                for index, image in enumerate(images[:5]):  # Limit to 5 new images
                    ProductImage.objects.create(
                        product=product,
                        image=image,
                        is_primary=False,  # Keep existing primary image
                        order=max_order + index + 1,
                    )

            messages.success(request, "Product updated successfully!")
            return redirect("products:product_detail", slug=product.slug)
    else:
        form = ProductForm(instance=product)

    return render(
        request, "products/edit_product.html", {"form": form, "product": product}
    )


@login_required
def delete_product_view(request, slug):
    product = get_object_or_404(Product, slug=slug, seller=request.user)
    product.delete()
    messages.success(request, "Product deleted successfully!")

    return redirect("products:seller_products")


@login_required
def add_review_view(request, slug):
    product = get_object_or_404(Product, slug=slug, is_active=True)

    # Check if user already reviewed this product
    if ProductReview.objects.filter(product=product, user=request.user).exists():
        messages.error(request, "You have already reviewed this product.")
        return redirect("products:product_detail", slug=slug)

    if request.method == "POST":
        form = ProductReviewForm(request.POST)
        if form.is_valid():
            review = form.save(commit=False)
            review.product = product
            review.user = request.user
            review.save()
            messages.success(request, "Review added successfully!")
            return redirect("products:product_detail", slug=slug)
    else:
        form = ProductReviewForm()

    return render(
        request, "products/add_review.html", {"form": form, "product": product}
    )


@login_required
def add_to_wishlist(request):
    if request.method == "POST":
        product_id = request.POST.get("product_id")
        product = get_object_or_404(Product, id=product_id, is_active=True)

        wishlist_item, created = Wishlist.objects.get_or_create(
            user=request.user, product=product
        )

        if created:
            return JsonResponse({"success": True, "message": "Added to wishlist"})
        else:
            return JsonResponse({"success": False, "message": "Already in wishlist"})

    return JsonResponse({"success": False, "message": "Invalid request"})


@login_required
def remove_from_wishlist(request):
    if request.method == "POST":
        product_id = request.POST.get("product_id")
        product = get_object_or_404(Product, id=product_id)

        try:
            wishlist_item = Wishlist.objects.get(user=request.user, product=product)
            wishlist_item.delete()
            return JsonResponse({"success": True, "message": "Removed from wishlist"})
        except Wishlist.DoesNotExist:
            return JsonResponse({"success": False, "message": "Not in wishlist"})

    return JsonResponse({"success": False, "message": "Invalid request"})


@login_required
def wishlist_view(request):
    wishlist_items = Wishlist.objects.filter(user=request.user).select_related(
        "product"
    )

    # Pagination
    paginator = Paginator(wishlist_items, 12)
    page_number = request.GET.get("page")
    page_obj = paginator.get_page(page_number)

    return render(request, "products/wishlist.html", {"page_obj": page_obj})


@login_required
def seller_products_view(request):
    if request.user.user_type != "seller":
        messages.error(request, "Access denied. Seller account required.")
        return redirect("home")

    products = Product.objects.filter(seller=request.user).order_by("-created_at")

    # Pagination
    paginator = Paginator(products, 10)
    page_number = request.GET.get("page")
    page_obj = paginator.get_page(page_number)

    return render(request, "products/seller_products.html", {"page_obj": page_obj})


@login_required
def apply_discount_view(request):
    # This view handles discount application in cart/checkout
    pass


@login_required
def delete_product_image(request):
    """Delete a product image via AJAX"""
    if request.method == "POST":
        try:
            import json

            data = json.loads(request.body)
            image_id = data.get("image_id")

            # Get the image and verify ownership
            image = get_object_or_404(
                ProductImage, id=image_id, product__seller=request.user
            )

            # Don't allow deletion if it's the only image
            if image.product.images.count() <= 1:
                return JsonResponse(
                    {
                        "success": False,
                        "message": "Cannot delete the last image. Please upload a new image first.",
                    }
                )

            # If deleting primary image, make another image primary
            if image.is_primary:
                next_image = image.product.images.exclude(id=image.id).first()
                if next_image:
                    next_image.is_primary = True
                    next_image.save()

            image.delete()

            return JsonResponse(
                {"success": True, "message": "Image deleted successfully"}
            )

        except Exception as e:
            return JsonResponse({"success": False, "message": str(e)})

    return JsonResponse({"success": False, "message": "Invalid request method"})


def about_us(request):
    return render(request, "products/about_us.html")
