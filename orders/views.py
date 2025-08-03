from django.shortcuts import render, get_object_or_404, redirect
from django.contrib.auth.decorators import login_required
from django.contrib import messages
from django.http import JsonResponse
from django.core.paginator import Paginator
from .models import Order, OrderItem, Payment


@login_required
def order_list_view(request):
    orders = Order.objects.filter(user=request.user).order_by("-created_at")

    # Pagination
    paginator = Paginator(orders, 10)
    page_number = request.GET.get("page")
    page_obj = paginator.get_page(page_number)

    return render(request, "orders/order_list.html", {"page_obj": page_obj})


@login_required
def order_detail_view(request, order_number):
    order = get_object_or_404(Order, order_number=order_number, user=request.user)
    order_items = order.items.select_related("product", "seller").all()

    context = {
        "order": order,
        "order_items": order_items,
    }

    return render(request, "orders/order_detail.html", context)


@login_required
def confirm_order_view(request, order_number):
    # This view is called after successful payment
    order = get_object_or_404(Order, order_number=order_number, user=request.user)

    if order.status == "pending":
        order.status = "confirmed"
        order.save()

        # Update product stock
        for item in order.items.all():
            product = item.product
            product.stock_quantity -= item.quantity
            product.save()

        messages.success(request, "Order confirmed successfully!")

    return render(request, "orders/order_confirmation.html", {"order": order})


@login_required
def cancel_order_view(request, order_number):
    order = get_object_or_404(Order, order_number=order_number, user=request.user)

    # Handle AJAX requests - check for XHR header or JSON content type
    is_ajax = (
        request.headers.get("X-Requested-With") == "XMLHttpRequest"
        or request.headers.get("Content-Type") == "application/json"
        or "application/json" in request.headers.get("Accept", "")
    )

    if is_ajax:
        if request.method == "POST":
            if order.status in ["pending", "confirmed"]:
                order.status = "cancelled"
                order.save()

                # Refund if payment was made
                if hasattr(order, "payment") and order.payment.status == "paid":
                    # Process refund
                    request.user.crazycart_balance += order.total_amount
                    request.user.save()

                    order.payment.status = "refunded"
                    order.payment.save()

                return JsonResponse(
                    {"success": True, "message": "Order cancelled successfully!"}
                )
            else:
                return JsonResponse(
                    {"success": False, "message": "Cannot cancel this order."}
                )
        else:
            return JsonResponse(
                {"success": False, "message": "Invalid request method."}
            )

    # Handle regular form requests
    if order.status in ["pending", "confirmed"]:
        order.status = "cancelled"
        order.save()

        # Refund if payment was made
        if hasattr(order, "payment") and order.payment.status == "paid":
            # Process refund
            request.user.crazycart_balance += order.total_amount
            request.user.save()

            order.payment.status = "refunded"
            order.payment.save()

        messages.success(request, "Order cancelled successfully!")
    else:
        messages.error(request, "Cannot cancel this order.")

    return redirect("orders:order_detail", order_number=order_number)


@login_required
def track_order_view(request, order_number):
    order = get_object_or_404(Order, order_number=order_number, user=request.user)
    tracking_updates = order.tracking_updates.all()

    context = {
        "order": order,
        "tracking_updates": tracking_updates,
    }

    return render(request, "orders/track_order.html", context)


@login_required
def seller_orders_view(request):
    if request.user.user_type != "seller":
        messages.error(request, "Access denied. Seller account required.")
        return redirect("home")

    order_items = (
        OrderItem.objects.filter(seller=request.user)
        .select_related("order", "product")
        .order_by("-created_at")
    )

    # Pagination
    paginator = Paginator(order_items, 20)
    page_number = request.GET.get("page")
    page_obj = paginator.get_page(page_number)

    return render(request, "orders/seller_orders.html", {"page_obj": page_obj})


@login_required
def seller_order_detail_view(request, order_number):
    if request.user.user_type != "seller":
        messages.error(request, "Access denied. Seller account required.")
        return redirect("home")

    # Get the order
    order = get_object_or_404(Order, order_number=order_number)

    # Check if seller has items in this order
    seller_items = order.items.filter(seller=request.user).select_related("product")
    if not seller_items.exists():
        messages.error(request, "Access denied. You do not have items in this order.")
        return redirect("orders:seller_orders")

    # Get all items in the order for context
    all_items = order.items.select_related("product", "seller").all()

    # Calculate seller's total value
    seller_total = sum(item.total_price for item in seller_items)

    context = {
        "order": order,
        "seller_items": seller_items,
        "all_items": all_items,
        "seller_total": seller_total,
    }

    return render(request, "orders/seller_order_detail.html", context)


@login_required
def update_order_status_view(request, order_number):
    if request.user.user_type != "seller":
        return JsonResponse(
            {"success": False, "message": "Access denied. Seller account required."}
        )

    order = get_object_or_404(Order, order_number=order_number)

    # Check if seller has items in this order
    if not order.items.filter(seller=request.user).exists():
        return JsonResponse({"success": False, "message": "Access denied."})

    if request.method == "POST":
        try:
            new_status = request.POST.get("status")
            tracking_number = request.POST.get("tracking_number", "")

            # Get valid status choices (just the keys)
            valid_statuses = [choice[0] for choice in Order.STATUS_CHOICES]

            if new_status in valid_statuses:
                # Update order items for this seller
                order.items.filter(seller=request.user).update(
                    status=new_status, tracking_number=tracking_number or None
                )

                # Update main order status if all items have same status
                all_items = order.items.all()
                if all(item.status == new_status for item in all_items):
                    order.status = new_status
                    order.save()

                return JsonResponse(
                    {"success": True, "message": "Order status updated successfully!"}
                )
            else:
                return JsonResponse({"success": False, "message": "Invalid status."})
        except Exception as e:
            return JsonResponse(
                {"success": False, "message": "Failed to update order status."}
            )

    return JsonResponse({"success": False, "message": "Invalid request method."})


@login_required
def process_payment_view(request):
    if request.method == "POST":
        from cart.models import Cart

        cart = get_object_or_404(Cart, user=request.user)

        if not cart.items.exists():
            return JsonResponse({"success": False, "message": "Cart is empty"})

        # Check user balance
        total_amount = cart.total_price
        if request.user.crazycart_balance < total_amount:
            return JsonResponse(
                {"success": False, "message": "Insufficient CrazyCart balance"}
            )

        # Create order
        order = Order.objects.create(
            user=request.user,
            subtotal=cart.subtotal,
            total_amount=total_amount,
            # Add shipping and billing info from form
            shipping_name=request.user.get_full_name(),
            shipping_email=request.user.email,
            shipping_phone=request.user.phone_number or "",
            shipping_address=request.user.address or "",
            shipping_city=request.user.city or "",
            shipping_state=request.user.state or "",
            shipping_postal_code=request.user.postal_code or "",
            shipping_country=request.user.country or "",
            billing_name=request.user.get_full_name(),
            billing_email=request.user.email,
            billing_phone=request.user.phone_number or "",
            billing_address=request.user.address or "",
            billing_city=request.user.city or "",
            billing_state=request.user.state or "",
            billing_postal_code=request.user.postal_code or "",
            billing_country=request.user.country or "",
        )

        # Create order items
        for cart_item in cart.items.all():
            OrderItem.objects.create(
                order=order,
                product=cart_item.product,
                seller=cart_item.product.seller,
                quantity=cart_item.quantity,
                price_at_time=cart_item.price_at_time,
                total_price=cart_item.total_price,
            )

        # Process payment
        Payment.objects.create(
            order=order,
            payment_method="crazycart_wallet",
            amount=total_amount,
            status="paid",
        )

        # Deduct from user balance
        request.user.crazycart_balance -= total_amount
        request.user.save()

        # Clear cart
        cart.items.all().delete()

        return JsonResponse(
            {
                "success": True,
                "message": "Payment successful",
                "order_number": order.order_number,
            }
        )

    return JsonResponse({"success": False, "message": "Invalid request method"})


@login_required
def process_buy_now_payment_view(request):
    """Process payment for buy now items"""
    try:
        print(f"=== BUY NOW PAYMENT DEBUG ===")
        print(f"Request method: {request.method}")
        print(f"User: {request.user}")
        print(
            f"User balance: {getattr(request.user, 'crazycart_balance', 'NOT FOUND')}"
        )

        if request.method == "POST":
            from products.models import Product

            buy_now_item = request.session.get("buy_now_item")
            print(f"Buy now item from session: {buy_now_item}")

            if not buy_now_item:
                print("ERROR: No buy_now_item in session")
                return JsonResponse(
                    {"success": False, "message": "No item found for purchase"}
                )

            try:
                product = Product.objects.get(
                    id=buy_now_item["product_id"], is_active=True
                )
                print(f"Product found: {product.name}, Stock: {product.stock_quantity}")
            except Product.DoesNotExist:
                print(f"ERROR: Product not found with ID: {buy_now_item['product_id']}")
                if "buy_now_item" in request.session:
                    del request.session["buy_now_item"]
                return JsonResponse(
                    {"success": False, "message": "Product is no longer available"}
                )

            # Check stock again
            print(
                f"Checking stock: requested={buy_now_item['quantity']}, available={product.stock_quantity}"
            )
            if buy_now_item["quantity"] > product.stock_quantity:
                if "buy_now_item" in request.session:
                    del request.session["buy_now_item"]
                return JsonResponse(
                    {"success": False, "message": "Not enough stock available"}
                )

            # Check user balance - handle decimal conversion properly
            from decimal import Decimal

            total_amount = Decimal(str(buy_now_item["total_price"]))
            user_balance = getattr(request.user, "crazycart_balance", Decimal("0.00"))
            print(
                f"Balance check: total_amount={total_amount} (type: {type(total_amount)}), user_balance={user_balance} (type: {type(user_balance)})"
            )
            if user_balance < total_amount:
                return JsonResponse(
                    {
                        "success": False,
                        "message": f"Insufficient CrazyCart balance. Required: {total_amount}, Available: {user_balance}",
                    }
                )

            # Get user info safely
            user_full_name = request.user.get_full_name() or request.user.username
            user_email = request.user.email or ""
            user_phone = getattr(request.user, "phone_number", "") or ""
            user_address = getattr(request.user, "address", "") or ""
            user_city = getattr(request.user, "city", "") or ""
            user_state = getattr(request.user, "state", "") or ""
            user_postal_code = getattr(request.user, "postal_code", "") or ""
            user_country = getattr(request.user, "country", "") or "Bangladesh"

            print(
                f"Creating order with user info: name={user_full_name}, email={user_email}"
            )

            # Create order with confirmed status since payment is immediate
            order = Order.objects.create(
                user=request.user,
                status="confirmed",  # Set to confirmed since payment is processed immediately
                payment_status="paid",  # Payment is successful
                subtotal=total_amount,
                total_amount=total_amount,
                # Add shipping and billing info from user profile
                shipping_name=user_full_name,
                shipping_email=user_email,
                shipping_phone=user_phone,
                shipping_address=user_address,
                shipping_city=user_city,
                shipping_state=user_state,
                shipping_postal_code=user_postal_code,
                shipping_country=user_country,
                billing_name=user_full_name,
                billing_email=user_email,
                billing_phone=user_phone,
                billing_address=user_address,
                billing_city=user_city,
                billing_state=user_state,
                billing_postal_code=user_postal_code,
                billing_country=user_country,
            )

            print(f"Order created: {order.order_number}")

            # Create order item
            order_item = OrderItem.objects.create(
                order=order,
                product=product,
                seller=product.seller,
                quantity=buy_now_item["quantity"],
                price_at_time=product.price,
                total_price=total_amount,
            )

            print(f"Order item created: {order_item}")

            # Process payment
            payment = Payment.objects.create(
                order=order,
                payment_method="crazycart_wallet",
                amount=total_amount,
                status="paid",
            )

            print(f"Payment created: {payment}")

            # Deduct from user balance - handle decimal properly
            request.user.crazycart_balance = user_balance - total_amount
            request.user.save()

            print(f"User balance updated: {request.user.crazycart_balance}")

            # Clear buy now item from session
            if "buy_now_item" in request.session:
                del request.session["buy_now_item"]

            print(f"SUCCESS: Payment processed successfully")

            return JsonResponse(
                {
                    "success": True,
                    "message": "Payment successful",
                    "order_number": order.order_number,
                }
            )

        return JsonResponse({"success": False, "message": "Invalid request method"})

    except Exception as e:
        # Log the error for debugging
        import logging

        logger = logging.getLogger(__name__)
        logger.error(f"Buy now payment error: {str(e)}", exc_info=True)

        # Clear session data if exists
        if "buy_now_item" in request.session:
            del request.session["buy_now_item"]

        # Return more specific error information for debugging
        error_details = str(e)

        return JsonResponse(
            {
                "success": False,
                "message": f"Payment error: {error_details}",
                "debug_info": {"error_type": type(e).__name__, "error_message": str(e)},
            }
        )


@login_required
def payment_success_view(request):
    order_number = request.GET.get("order")
    order = get_object_or_404(Order, order_number=order_number, user=request.user)

    return render(request, "orders/payment_success.html", {"order": order})


@login_required
def payment_failed_view(request):
    return render(request, "orders/payment_failed.html")


@login_required
def complete_cart_payment_view(request):
    """Complete payment for cart checkout"""
    if request.method != "POST":
        return JsonResponse({"success": False, "error": "Invalid request method"})

    try:
        import json

        data = json.loads(request.body)
        order_id = data.get("order_id")
        payment_method = data.get("payment_method")

        if not order_id or not payment_method:
            return JsonResponse({"success": False, "error": "Missing required data"})

        # Get the order
        order = get_object_or_404(Order, id=order_id, user=request.user)

        if order.payment_status == "paid":
            return JsonResponse({"success": False, "error": "Order already paid"})

        from django.db import transaction
        from cart.models import Cart

        with transaction.atomic():
            # Update payment record
            payment = order.payment
            payment.payment_method = payment_method
            payment.status = "paid"
            payment.save()

            # Update order status
            order.status = "confirmed"
            order.payment_status = "paid"
            order.save()

            # Update product stock
            for item in order.items.all():
                product = item.product
                product.stock_quantity -= item.quantity
                product.save()

            # Clear the user's cart
            try:
                cart = Cart.objects.get(user=request.user)
                cart.items.all().delete()
                cart.save()
            except Cart.DoesNotExist:
                pass

            # Clear session data
            if "pending_order_id" in request.session:
                del request.session["pending_order_id"]

        return JsonResponse(
            {
                "success": True,
                "message": "Payment completed successfully!",
                "redirect_url": f"/orders/{order.order_number}/",
            }
        )

    except Exception as e:
        return JsonResponse({"success": False, "error": str(e)})


@login_required
def create_order_view(request):
    """Create order from cart checkout"""
    try:
        if request.method != "POST":
            messages.error(request, "Invalid request method")
            return redirect("cart:checkout")

        from cart.models import Cart

        try:
            cart = Cart.objects.get(user=request.user)
        except Cart.DoesNotExist:
            messages.error(request, "Cart not found")
            return redirect("cart:cart")

        cart_items = cart.items.select_related("product").all()

        if not cart_items:
            messages.error(request, "Your cart is empty")
            return redirect("cart:cart")

        # Get and validate form data
        payment_method = request.POST.get("payment_method")
        if not payment_method:
            messages.error(request, "Please select a payment method")
            return redirect("cart:checkout")

        # Validate required shipping fields
        required_fields = [
            "shipping_name",
            "shipping_email",
            "shipping_phone",
            "shipping_city",
            "shipping_address",
            "shipping_country",
        ]
        missing_fields = []

        for field in required_fields:
            if not request.POST.get(field, "").strip():
                missing_fields.append(
                    field.replace("shipping_", "").replace("_", " ").title()
                )

        if missing_fields:
            messages.error(
                request,
                f'Please fill in all required fields: {", ".join(missing_fields)}',
            )
            return redirect("cart:checkout")

        # Validate stock
        for item in cart_items:
            if item.quantity > item.product.stock_quantity:
                messages.error(
                    request,
                    f"Not enough stock for {item.product.name}. Available: {item.product.stock_quantity}, Requested: {item.quantity}",
                )
                return redirect("cart:cart")

            if not item.product.is_active:
                messages.error(request, f"{item.product.name} is no longer available")
                return redirect("cart:cart")

        # Validate payment method specific requirements
        if payment_method == "crazycart_wallet":
            user_balance = getattr(request.user, "crazycart_balance", 0)
            if user_balance < cart.total_price:
                messages.error(
                    request,
                    f"Insufficient wallet balance. Available: ৳{user_balance}, Required: ৳{cart.total_price}",
                )
                return redirect("cart:checkout")

        try:
            from django.db import transaction
            import logging

            logger = logging.getLogger(__name__)

            with transaction.atomic():
                logger.info(
                    f"Creating order for user {request.user.username} with payment method {payment_method}"
                )

                # Create order
                order = Order.objects.create(
                    user=request.user,
                    subtotal=cart.subtotal,
                    total_amount=cart.total_price,
                    # Shipping details
                    shipping_name=request.POST.get("shipping_name"),
                    shipping_email=request.POST.get("shipping_email"),
                    shipping_phone=request.POST.get("shipping_phone"),
                    shipping_address=request.POST.get("shipping_address"),
                    shipping_city=request.POST.get("shipping_city"),
                    shipping_state=request.POST.get("shipping_state", ""),
                    shipping_postal_code=request.POST.get("shipping_postal_code", ""),
                    shipping_country=request.POST.get("shipping_country"),
                    # Billing (same as shipping)
                    billing_name=request.POST.get("shipping_name"),
                    billing_email=request.POST.get("shipping_email"),
                    billing_phone=request.POST.get("shipping_phone"),
                    billing_address=request.POST.get("shipping_address"),
                    billing_city=request.POST.get("shipping_city"),
                    billing_state=request.POST.get("shipping_state", ""),
                    billing_postal_code=request.POST.get("shipping_postal_code", ""),
                    billing_country=request.POST.get("shipping_country"),
                )

                logger.info(f"Order created with number: {order.order_number}")

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

                logger.info(f"Created {cart_items.count()} order items")

                # Process payment
                if payment_method == "crazycart_wallet":
                    # Double-check wallet balance inside transaction
                    request.user.refresh_from_db()
                    if request.user.crazycart_balance < order.total_amount:
                        logger.error(
                            f"Insufficient wallet balance during transaction: {request.user.crazycart_balance} < {order.total_amount}"
                        )
                        messages.error(request, "Insufficient wallet balance")
                        return redirect("cart:checkout")

                    # Deduct from wallet
                    request.user.crazycart_balance -= order.total_amount
                    request.user.save()

                    logger.info(f"Deducted ৳{order.total_amount} from user wallet")

                    # Create payment record
                    Payment.objects.create(
                        order=order,
                        payment_method="crazycart_wallet",
                        amount=order.total_amount,
                        status="paid",
                    )

                    # Update order status
                    order.status = "confirmed"
                    order.payment_status = "paid"
                    order.save()

                    # Update stock
                    for item in order.items.all():
                        product = item.product
                        product.stock_quantity -= item.quantity
                        product.save()
                        logger.info(
                            f"Updated stock for {product.name}: -{item.quantity}"
                        )
 
                    # Clear cart
                    cart.items.all().delete()
                    cart.save()

                    messages.success(request, "Order placed successfully!")
                    return redirect(
                        "orders:order_detail", order_number=order.order_number
                    )

                elif payment_method == "cash_on_delivery":
                    # Create payment record for COD
                    Payment.objects.create(
                        order=order,
                        payment_method="cash_on_delivery",
                        amount=order.total_amount,
                        status="pending",
                    )

                    # Update order status
                    order.status = "confirmed"
                    order.payment_status = "pending"
                    order.save()

                    # Update stock
                    for item in order.items.all():
                        product = item.product
                        product.stock_quantity -= item.quantity
                        product.save()

                    # Clear cart
                    cart.items.all().delete()
                    cart.save()

                    messages.success(
                        request,
                        "Order placed successfully! You can pay when the order arrives.",
                    )
                    return redirect(
                        "orders:order_detail", order_number=order.order_number
                    )

                else:
                    logger.error(f"Invalid payment method: {payment_method}")
                    messages.error(request, "Invalid payment method")
                    return redirect("cart:checkout")

        except Exception as e:
            import logging

            logger = logging.getLogger(__name__)
            logger.error(f"Error creating order: {str(e)}", exc_info=True)
            messages.error(
                request,
                "An error occurred while processing your payment. Please try again.",
            )
            return redirect("cart:checkout")

    except Exception as e:
        import logging

        logger = logging.getLogger(__name__)
        logger.error(f"Unexpected error in create_order_view: {str(e)}", exc_info=True)
        messages.error(request, "An unexpected error occurred. Please try again.")
        return redirect("cart:checkout")
