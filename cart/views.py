from django.shortcuts import render, get_object_or_404, redirect
from django.contrib.auth.decorators import login_required
from django.contrib import messages
from django.http import JsonResponse
from django.views.decorators.http import require_POST
from .models import Cart, CartItem
from products.models import Product, Discount


@login_required
def cart_view(request):
    cart, created = Cart.objects.get_or_create(user=request.user)
    cart_items = cart.items.select_related("product").all()

    context = {
        "cart": cart,
        "cart_items": cart_items,
    }

    return render(request, "cart/cart.html", context)


@login_required
def add_to_cart(request):
    import json
    from decimal import Decimal

    # Handle GET requests (for regular product additions and bargained items)
    if request.method == "GET":
        product_id = request.GET.get("product_id")
        quantity = int(request.GET.get("quantity", 1))
        custom_price = request.GET.get("price")  # For bargaining agreed price
        bargain_id = request.GET.get("bargain_id")  # To track which bargain this is for

        if not product_id:
            messages.error(request, "Product not specified")
            return redirect("cart:cart")

        product = get_object_or_404(Product, id=product_id, is_active=True)

        if quantity <= 0:
            messages.error(request, "Invalid quantity")
            return redirect("cart:cart")

        if quantity > product.stock_quantity:
            messages.error(request, "Not enough stock available")
            return redirect("cart:cart")

        # If this is from a bargain, verify the bargain is accepted and user is the buyer
        if bargain_id and custom_price:
            try:
                from bargaining.models import BargainRequest

                bargain = BargainRequest.objects.get(
                    id=bargain_id, status="accepted", buyer=request.user
                )
                # Use the agreed price from bargain
                price_to_use = Decimal(str(custom_price))
            except BargainRequest.DoesNotExist:
                messages.error(
                    request,
                    "Invalid bargain or you're not authorized to use this price",
                )
                return redirect("cart:cart")
        else:
            # Regular product addition at normal price
            price_to_use = product.price

        cart, created = Cart.objects.get_or_create(user=request.user)

        cart_item, item_created = CartItem.objects.get_or_create(
            cart=cart,
            product=product,
            defaults={"quantity": quantity, "price_at_time": price_to_use},
        )

        if not item_created:
            # Update existing item - use the better price (lower) if from bargain
            if custom_price and Decimal(str(custom_price)) < cart_item.price_at_time:
                cart_item.price_at_time = Decimal(str(custom_price))
            cart_item.quantity += quantity
            if cart_item.quantity > product.stock_quantity:
                cart_item.quantity = product.stock_quantity
            cart_item.save()

        # If this was from a bargain, mark it as completed
        if bargain_id and custom_price:
            try:
                from bargaining.models import BargainRequest

                bargain = BargainRequest.objects.get(
                    id=bargain_id, status="accepted", buyer=request.user
                )
                bargain.status = "completed"
                bargain.save()
                messages.success(
                    request,
                    f"🎉 Bargained item added to cart at agreed price ৳{custom_price}! Your negotiation was successful.",
                )
            except Exception as e:
                messages.success(
                    request, f"Product added to cart at agreed price ৳{custom_price}"
                )
        else:
            messages.success(request, "Product added to cart")

        return redirect("cart:cart")

    # Handle POST requests (JSON and form data)
    elif request.method == "POST":
        # Handle both JSON and form data
        if request.content_type == "application/json":
            data = json.loads(request.body)
            product_id = data.get("product_id")
            quantity = int(data.get("quantity", 1))
        else:
            product_id = request.POST.get("product_id")
            quantity = int(request.POST.get("quantity", 1))

        product = get_object_or_404(Product, id=product_id, is_active=True)

        if quantity <= 0:
            return JsonResponse({"success": False, "message": "Invalid quantity"})

        if quantity > product.stock_quantity:
            return JsonResponse(
                {"success": False, "message": "Not enough stock available"}
            )

        cart, created = Cart.objects.get_or_create(user=request.user)

        cart_item, item_created = CartItem.objects.get_or_create(
            cart=cart,
            product=product,
            defaults={"quantity": quantity, "price_at_time": product.price},
        )

        if not item_created:
            # Update existing item
            cart_item.quantity += quantity
            if cart_item.quantity > product.stock_quantity:
                cart_item.quantity = product.stock_quantity
            cart_item.save()

        return JsonResponse(
            {
                "success": True,
                "message": "Product added to cart",
                "cart_count": cart.total_items,
            }
        )


@login_required
@require_POST
def update_cart_item(request):
    import json

    # Handle both JSON and form data
    if request.content_type == "application/json":
        data = json.loads(request.body)
        cart_item_id = data.get("cart_item_id")
        quantity = int(data.get("quantity", 1))
    else:
        cart_item_id = request.POST.get("cart_item_id")
        quantity = int(request.POST.get("quantity", 1))

    cart_item = get_object_or_404(CartItem, id=cart_item_id, cart__user=request.user)

    if quantity <= 0:
        cart_item.delete()
        return JsonResponse({"success": True, "message": "Item removed from cart"})

    if quantity > cart_item.product.stock_quantity:
        return JsonResponse({"success": False, "message": "Not enough stock available"})

    cart_item.quantity = quantity
    cart_item.save()

    return JsonResponse({"success": True, "message": "Cart updated"})


@login_required
@require_POST
def remove_from_cart(request):
    cart_item_id = request.POST.get("cart_item_id")
    cart_item = get_object_or_404(CartItem, id=cart_item_id, cart__user=request.user)
    cart_item.delete()

    messages.success(request, "Item removed from cart")
    return redirect("cart:cart")


@login_required
@require_POST
def clear_cart(request):
    cart = get_object_or_404(Cart, user=request.user)
    cart.items.all().delete()

    messages.success(request, "Cart cleared")
    return redirect("cart:cart")


@login_required
def checkout_view(request):
    cart = get_object_or_404(Cart, user=request.user)

    if not cart.items.exists():
        messages.error(request, "Your cart is empty")
        return redirect("cart:cart")

    # Check stock availability
    for item in cart.items.all():
        if item.quantity > item.product.stock_quantity:
            messages.error(request, f"Not enough stock for {item.product.name}")
            return redirect("cart:cart")

    context = {
        "cart": cart,
        "cart_items": cart.items.select_related("product").all(),
    }

    return render(request, "cart/checkout.html", context)


@login_required
@require_POST
def apply_discount_to_cart(request):
    discount_code = request.POST.get("discount_code")

    try:
        discount = Discount.objects.get(code=discount_code, is_active=True)

        if not discount.is_valid:
            return JsonResponse(
                {
                    "success": False,
                    "message": "Discount code is not valid or has expired",
                }
            )

        cart = get_object_or_404(Cart, user=request.user)

        if cart.subtotal < discount.minimum_order_amount:
            messages.error(request, "Minimum order amount not met for this discount")
            return redirect("cart:cart")

        # Remove existing discount if any
        if hasattr(cart, "applied_discount"):
            cart.applied_discount.delete()

        # Apply new discount
        from .models import AppliedDiscount

        AppliedDiscount.objects.create(cart=cart, discount=discount)

        return redirect("cart:cart")

    except Discount.DoesNotExist:
        messages.error(request, "Invalid discount code")
        return redirect("cart:cart")


@login_required
@require_POST
def buy_now_view(request):
    """Handle buy now functionality - create a temporary session-based cart"""
    import json

    # Handle both JSON and form data
    if request.content_type == "application/json":
        data = json.loads(request.body)
        product_id = data.get("product_id")
        quantity = int(data.get("quantity", 1))
    else:
        product_id = request.POST.get("product_id")
        quantity = int(request.POST.get("quantity", 1))

    product = get_object_or_404(Product, id=product_id, is_active=True)

    # Validation
    if quantity <= 0:
        return JsonResponse({"success": False, "message": "Invalid quantity"})

    if quantity > product.stock_quantity:
        return JsonResponse({"success": False, "message": "Not enough stock available"})

    if product.seller == request.user:
        return JsonResponse(
            {"success": False, "message": "You cannot buy your own product"}
        )

    # Store buy now item in session
    buy_now_item = {
        "product_id": product.id,
        "product_name": product.name,
        "product_price": str(product.price),
        "quantity": quantity,
        "total_price": str(product.price * quantity),
        "seller_id": product.seller.id,
        "seller_name": product.seller.get_full_name() or product.seller.username,
    }

    request.session["buy_now_item"] = buy_now_item

    return JsonResponse(
        {
            "success": True,
            "message": "Redirecting to checkout...",
            "redirect_url": "/cart/buy-now/checkout/",
        }
    )


@login_required
def buy_now_checkout_view(request):
    """Checkout view for buy now items"""
    buy_now_item = request.session.get("buy_now_item")

    if not buy_now_item:
        messages.error(request, "No item found for checkout")
        return redirect("products:product_list")

    # Get the actual product to ensure it's still available
    try:
        product = Product.objects.get(id=buy_now_item["product_id"], is_active=True)
    except Product.DoesNotExist:
        del request.session["buy_now_item"]
        messages.error(request, "Product is no longer available")
        return redirect("products:product_list")

    # Check stock again
    if buy_now_item["quantity"] > product.stock_quantity:
        del request.session["buy_now_item"]
        messages.error(request, "Not enough stock available")
        return redirect("products:product_detail", slug=product.slug)

    context = {
        "buy_now_item": buy_now_item,
        "product": product,
        "total_amount": float(buy_now_item["total_price"]),
    }

    return render(request, "cart/buy_now_checkout.html", context)


@login_required
def online_checkout_view(request):
    """Handle online payment for cart checkout"""
    if request.method != "POST":
        return redirect("cart:checkout")

    cart = get_object_or_404(Cart, user=request.user)
    cart_items = cart.items.select_related("product").all()

    if not cart_items:
        messages.error(request, "Your cart is empty")
        return redirect("cart:cart")

    # Validate stock again
    for item in cart_items:
        if item.quantity > item.product.stock_quantity:
            messages.error(request, f"Not enough stock for {item.product.name}")
            return redirect("cart:cart")

    # Create order with shipping information from the form
    from orders.models import Order, OrderItem, Payment
    from django.db import transaction

    try:
        with transaction.atomic():
            # Create order
            order = Order.objects.create(
                user=request.user,
                subtotal=cart.subtotal,
                total_amount=cart.total_price,
                # Shipping details from form
                shipping_name=request.POST.get("shipping_name"),
                shipping_email=request.POST.get("shipping_email"),
                shipping_phone=request.POST.get("shipping_phone"),
                shipping_address=request.POST.get("shipping_address"),
                shipping_city=request.POST.get("shipping_city"),
                shipping_state=request.POST.get("shipping_state", ""),
                shipping_postal_code=request.POST.get("shipping_postal_code", ""),
                shipping_country=request.POST.get("shipping_country"),
                # Billing (same as shipping for now)
                billing_name=request.POST.get("shipping_name"),
                billing_email=request.POST.get("shipping_email"),
                billing_phone=request.POST.get("shipping_phone"),
                billing_address=request.POST.get("shipping_address"),
                billing_city=request.POST.get("shipping_city"),
                billing_state=request.POST.get("shipping_state", ""),
                billing_postal_code=request.POST.get("shipping_postal_code", ""),
                billing_country=request.POST.get("shipping_country"),
            )

            # Create order items
            for item in cart_items:
                OrderItem.objects.create(
                    order=order,
                    product=item.product,
                    seller=item.product.seller,
                    quantity=item.quantity,
                    price_at_time=item.price_at_time,
                    total_price=item.total_price,
                )

            # Create payment record
            Payment.objects.create(
                order=order,
                payment_method="credit_card",  # Default for online
                amount=order.total_amount,
                status="pending",
            )

            # Store order ID in session for payment page
            request.session["pending_order_id"] = order.id

    except Exception as e:
        messages.error(request, f"Error creating order: {str(e)}")
        return redirect("cart:checkout")

    # Redirect to payment gateway simulation
    context = {
        "order": order,
        "cart_items": cart_items,
        "amount": float(order.total_amount),
    }
    return render(request, "cart/online_payment.html", context)
