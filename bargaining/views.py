from django.shortcuts import render, get_object_or_404, redirect
from django.contrib.auth.decorators import login_required
from django.contrib import messages
from django.http import JsonResponse
from django.core.paginator import Paginator
from django.utils import timezone
from datetime import timedelta
from django.db import transaction
from decimal import Decimal
from .models import BargainRequest, BargainMessage, BargainSettings
from products.models import Product
from orders.models import Order, OrderItem, Payment
from accounts.models import User


@login_required
def create_bargain_request(request):
    if request.method == "POST":
        product_id = request.POST.get("product_id")
        offered_price = request.POST.get("offered_price")
        message = request.POST.get("message", "")
        quantity = int(request.POST.get("quantity", 1))

        product = get_object_or_404(Product, id=product_id, is_active=True)

        if not product.allow_bargaining:
            return JsonResponse(
                {"success": False, "message": "Bargaining not allowed for this product"}
            )

        if product.seller == request.user:
            return JsonResponse(
                {"success": False, "message": "You cannot bargain on your own product"}
            )

        # Check if user already has a pending bargain for this product
        existing_bargain = BargainRequest.objects.filter(
            buyer=request.user, product=product, status="pending"
        ).first()

        if existing_bargain:
            return JsonResponse(
                {
                    "success": False,
                    "message": "You already have a pending bargain for this product",
                }
            )

        # Create bargain request
        bargain_request = BargainRequest.objects.create(
            buyer=request.user,
            seller=product.seller,
            product=product,
            original_price=product.price,
            requested_price=offered_price,
            current_offer=offered_price,
            message=message,
            quantity=quantity,
            expires_at=timezone.now() + timedelta(days=7),  # 7 days to respond
        )

        # Create initial message
        if message:
            BargainMessage.objects.create(
                bargain_request=bargain_request,
                sender=request.user,
                message=message,
                offered_price=offered_price,
                is_counter_offer=False,
            )

        return JsonResponse(
            {"success": True, "message": "Bargain request sent successfully!"}
        )

    return JsonResponse({"success": False, "message": "Invalid request method"})


@login_required
def bargain_requests_view(request):
    """View for buyers to see their bargain requests"""
    bargains = (
        BargainRequest.objects.filter(buyer=request.user)
        .select_related("product", "seller")
        .order_by("-created_at")
    )

    # Pagination
    paginator = Paginator(bargains, 10)
    page_number = request.GET.get("page")
    page_obj = paginator.get_page(page_number)

    return render(request, "bargaining/bargain_requests.html", {"page_obj": page_obj})


@login_required
def received_bargains_view(request):
    """View for sellers to see received bargain requests"""
    if request.user.user_type != "seller":
        messages.error(request, "Access denied. Seller account required.")
        return redirect("home")

    bargains = (
        BargainRequest.objects.filter(seller=request.user)
        .select_related("product", "buyer")
        .order_by("-created_at")
    )

    # Pagination
    paginator = Paginator(bargains, 10)
    page_number = request.GET.get("page")
    page_obj = paginator.get_page(page_number)

    return render(request, "bargaining/received_bargains.html", {"page_obj": page_obj})


@login_required
def bargain_detail_view(request, bargain_id):
    bargain = get_object_or_404(BargainRequest, id=bargain_id)

    # Check if user is involved in this bargain
    if bargain.buyer != request.user and bargain.seller != request.user:
        messages.error(request, "Access denied.")
        return redirect("home")

    messages = bargain.messages.select_related("sender").order_by("created_at")

    # Calculate savings
    original_total = bargain.original_price * bargain.quantity
    current_price = bargain.current_offer or bargain.requested_price
    current_total = current_price * bargain.quantity
    savings = original_total - current_total if original_total > current_total else 0

    context = {
        "bargain": bargain,
        "messages": messages,
        "original_total": original_total,
        "current_total": current_total,
        "savings": savings,
    }

    return render(request, "bargaining/bargain_detail.html", context)


@login_required
def respond_to_bargain(request, bargain_id):
    import logging

    logger = logging.getLogger(__name__)

    logger.info(f"respond_to_bargain called with bargain_id: {bargain_id}")
    logger.info(f"Request method: {request.method}")
    logger.info(f"Request user: {request.user}")
    logger.info(f"POST data: {request.POST}")

    if request.method != "POST":
        return JsonResponse({"success": False, "message": "Invalid request method"})

    # Allow both seller and buyer to respond
    bargain = get_object_or_404(BargainRequest, id=bargain_id)
    logger.info(f"Bargain found: {bargain}")
    logger.info(f"Bargain status: {bargain.status}")
    logger.info(f"Bargain buyer: {bargain.buyer}")
    logger.info(f"Bargain seller: {bargain.seller}")

    # Check if user is either the seller or buyer
    if request.user != bargain.seller and request.user != bargain.buyer:
        logger.warning(f"User {request.user} not authorized for bargain {bargain_id}")
        return JsonResponse(
            {
                "success": False,
                "message": "You are not authorized to respond to this bargain",
            }
        )

    # Allow responses for pending and countered status
    if bargain.status not in ["pending", "countered"]:
        logger.warning(f"Bargain {bargain_id} status {bargain.status} not active")
        return JsonResponse(
            {"success": False, "message": "Bargain is no longer active"}
        )

    action = request.POST.get("action")
    counter_offer = request.POST.get("counter_offer")
    message = request.POST.get("message", "")

    logger.info(f"Action: {action}, Counter offer: {counter_offer}, Message: {message}")

    if action == "accept":
        try:
            # Check if product still has enough stock
            if bargain.quantity > bargain.product.stock_quantity:
                return JsonResponse(
                    {
                        "success": False,
                        "message": f"Sorry, only {bargain.product.stock_quantity} items are available in stock.",
                    }
                )

            bargain.status = "accepted"
            bargain.responded_at = timezone.now()
            bargain.save()

            # Add message
            offer_price = bargain.current_offer or bargain.requested_price
            BargainMessage.objects.create(
                bargain_request=bargain,
                sender=request.user,
                message=message or f"Offer accepted at ৳{offer_price}",
                is_counter_offer=False,
            )

            logger.info(f"Bargain {bargain_id} accepted by {request.user}")
            logger.info(f"Agreed price: ৳{offer_price}, Quantity: {bargain.quantity}")

            # Provide different messages based on who accepted
            if request.user == bargain.seller:
                success_message = "Bargain accepted! The buyer will be notified and can add the item to their cart at the agreed price."
                # Redirect seller back to received bargains
                from django.urls import reverse

                redirect_url = reverse("bargaining:received_bargains")
            else:
                success_message = "Counter offer accepted! You can now add the item to your cart at the agreed price."
                # Redirect buyer to bargain detail to see the "Add to Cart" button
                redirect_url = reverse("bargaining:bargain_detail", args=[bargain.id])

            return JsonResponse(
                {
                    "success": True,
                    "message": success_message,
                    "redirect_url": redirect_url,
                    "agreed_price": str(offer_price),
                    "quantity": bargain.quantity,
                }
            )
        except Exception as e:
            logger.error(f"Error accepting bargain {bargain_id}: {str(e)}")
            return JsonResponse(
                {
                    "success": False,
                    "message": "Failed to accept offer. Please try again.",
                }
            )

    elif action == "reject":
        try:
            bargain.status = "rejected"
            bargain.responded_at = timezone.now()
            bargain.save()

            # Add message
            BargainMessage.objects.create(
                bargain_request=bargain,
                sender=request.user,
                message=message or "Offer rejected",
                is_counter_offer=False,
            )

            logger.info(f"Bargain {bargain_id} rejected by {request.user}")
            return JsonResponse({"success": True, "message": "Offer rejected"})
        except Exception as e:
            logger.error(f"Error rejecting bargain {bargain_id}: {str(e)}")
            return JsonResponse(
                {
                    "success": False,
                    "message": "Failed to reject offer. Please try again.",
                }
            )

    elif action == "counter" and counter_offer:
        try:
            # Validate counter_offer is a valid decimal
            from decimal import Decimal, InvalidOperation

            counter_offer_decimal = Decimal(str(counter_offer))
            logger.info(f"Counter offer decimal: {counter_offer_decimal}")

            bargain.status = "countered"
            bargain.current_offer = counter_offer_decimal
            bargain.responded_at = timezone.now()
            bargain.save()

            # Add counter offer message
            BargainMessage.objects.create(
                bargain_request=bargain,
                sender=request.user,
                message=message or f"Counter offer: ৳{counter_offer}",
                offered_price=counter_offer_decimal,
                is_counter_offer=True,
            )

            logger.info(
                f"Counter offer sent for bargain {bargain_id} by {request.user}"
            )
            return JsonResponse({"success": True, "message": "Counter offer sent!"})

        except (InvalidOperation, ValueError) as e:
            logger.error(f"Invalid counter offer amount: {counter_offer}, error: {e}")
            return JsonResponse(
                {"success": False, "message": "Invalid counter offer amount"}
            )
        except Exception as e:
            logger.error(
                f"Error sending counter offer for bargain {bargain_id}: {str(e)}"
            )
            return JsonResponse(
                {
                    "success": False,
                    "message": "Failed to send counter offer. Please try again.",
                }
            )

    elif action == "counter" and not counter_offer:
        logger.warning(f"Counter action without counter_offer for bargain {bargain_id}")
        return JsonResponse(
            {"success": False, "message": "Counter offer amount is required"}
        )

    logger.warning(f"Invalid action '{action}' for bargain {bargain_id}")
    return JsonResponse({"success": False, "message": "Invalid action"})


@login_required
def add_bargain_message(request, bargain_id):
    if request.method != "POST":
        return JsonResponse({"success": False, "message": "Invalid request method"})

    bargain = get_object_or_404(BargainRequest, id=bargain_id)

    # Check if user is involved in this bargain
    if bargain.buyer != request.user and bargain.seller != request.user:
        return JsonResponse({"success": False, "message": "Access denied"})

    message = request.POST.get("message", "").strip()
    if not message:
        return JsonResponse({"success": False, "message": "Message cannot be empty"})

    BargainMessage.objects.create(
        bargain_request=bargain,
        sender=request.user,
        message=message,
        is_counter_offer=False,
    )

    return JsonResponse({"success": True, "message": "Message sent!"})


@login_required
def bargain_settings_view(request):
    if request.user.user_type != "seller":
        messages.error(request, "Access denied. Seller account required.")
        return redirect("home")

    settings, created = BargainSettings.objects.get_or_create(seller=request.user)

    if request.method == "POST":
        # Update settings
        settings.enable_auto_accept = request.POST.get("enable_auto_accept") == "on"
        settings.auto_accept_threshold = (
            request.POST.get("auto_accept_threshold") or None
        )
        settings.enable_auto_reject = request.POST.get("enable_auto_reject") == "on"
        settings.auto_reject_threshold = (
            request.POST.get("auto_reject_threshold") or None
        )
        settings.enable_auto_counter = request.POST.get("enable_auto_counter") == "on"
        settings.counter_offer_percentage = (
            request.POST.get("counter_offer_percentage") or None
        )
        settings.default_response_time_hours = int(
            request.POST.get("default_response_time_hours", 24)
        )
        settings.save()

        messages.success(request, "Bargain settings updated successfully!")
        return redirect("bargaining:bargain_settings")

    return render(request, "bargaining/bargain_settings.html", {"settings": settings})


@login_required
def process_payment(request, bargain_id):
    """Process payment for an accepted bargain"""
    if request.method != "POST":
        return JsonResponse({"success": False, "error": "Invalid request method"})

    bargain = get_object_or_404(BargainRequest, id=bargain_id, buyer=request.user)

    if bargain.status != "accepted":
        return JsonResponse({"success": False, "error": "Bargain is not accepted"})

    try:
        import json

        data = json.loads(request.body)
        payment_method = data.get("payment_method")

        if not payment_method:
            return JsonResponse(
                {"success": False, "error": "Payment method not specified"}
            )

        final_price = bargain.current_offer or bargain.requested_price
        total_amount = final_price * bargain.quantity

        with transaction.atomic():
            # Create order
            order = Order.objects.create(
                user=request.user,
                subtotal=total_amount,
                total_amount=total_amount,
                # Shipping details (you can get these from user profile or ask for them)
                shipping_name=request.user.get_full_name() or request.user.username,
                shipping_email=request.user.email,
                shipping_phone=getattr(request.user, "phone_number", "") or "",
                shipping_address=getattr(request.user, "address", "") or "",
                shipping_city=getattr(request.user, "city", "") or "",
                shipping_state=getattr(request.user, "state", "") or "",
                shipping_postal_code=getattr(request.user, "postal_code", "") or "",
                shipping_country=getattr(request.user, "country", "") or "USA",
                # Same for billing
                billing_name=request.user.get_full_name() or request.user.username,
                billing_email=request.user.email,
                billing_phone=getattr(request.user, "phone_number", "") or "",
                billing_address=getattr(request.user, "address", "") or "",
                billing_city=getattr(request.user, "city", "") or "",
                billing_state=getattr(request.user, "state", "") or "",
                billing_postal_code=getattr(request.user, "postal_code", "") or "",
                billing_country=getattr(request.user, "country", "") or "USA",
            )

            # Create order item
            OrderItem.objects.create(
                order=order,
                product=bargain.product,
                seller=bargain.seller,
                quantity=bargain.quantity,
                price_at_time=final_price,
                total_price=total_amount,
            )

            # Process payment based on method
            if payment_method == "crazycart_wallet":
                # Check wallet balance
                if request.user.crazycart_balance < total_amount:
                    return JsonResponse(
                        {"success": False, "error": "Insufficient wallet balance"}
                    )

                # Deduct from wallet
                request.user.crazycart_balance -= total_amount
                request.user.save()

                # Create payment record
                payment = Payment.objects.create(
                    order=order,
                    payment_method="crazycart_wallet",
                    amount=total_amount,
                    status="paid",
                )

                # Update order status
                order.status = "confirmed"
                order.payment_status = "paid"
                order.save()

                # Mark bargain as completed
                bargain.status = "completed"
                bargain.save()

                return JsonResponse(
                    {
                        "success": True,
                        "message": "Payment successful!",
                        "redirect_url": f"/orders/{order.order_number}/",
                    }
                )

            elif payment_method == "cash_on_delivery":
                # Create payment record for COD
                payment = Payment.objects.create(
                    order=order,
                    payment_method="cash_on_delivery",
                    amount=total_amount,
                    status="pending",
                )

                # Update order status
                order.status = "confirmed"
                order.payment_status = "pending"
                order.save()

                # Mark bargain as completed
                bargain.status = "completed"
                bargain.save()

                return JsonResponse(
                    {
                        "success": True,
                        "message": "Order placed successfully!",
                        "redirect_url": f"/orders/{order.order_number}/",
                    }
                )

            else:
                return JsonResponse(
                    {"success": False, "error": "Invalid payment method"}
                )

    except Exception as e:
        return JsonResponse({"success": False, "error": str(e)})


@login_required
def online_payment(request, bargain_id):
    """Handle online payment (redirect to payment gateway)"""
    bargain = get_object_or_404(BargainRequest, id=bargain_id, buyer=request.user)

    if bargain.status != "accepted":
        messages.error(request, "Bargain is not accepted")
        return redirect("bargaining:bargain_requests")

    final_price = bargain.current_offer or bargain.requested_price
    total_amount = final_price * bargain.quantity

    # Create order
    with transaction.atomic():
        order = Order.objects.create(
            user=request.user,
            subtotal=total_amount,
            total_amount=total_amount,
            shipping_name=request.user.get_full_name() or request.user.username,
            shipping_email=request.user.email,
            shipping_phone=getattr(request.user, "phone_number", "") or "",
            shipping_address=getattr(request.user, "address", "") or "",
            shipping_city=getattr(request.user, "city", "") or "",
            shipping_state=getattr(request.user, "state", "") or "",
            shipping_postal_code=getattr(request.user, "postal_code", "") or "",
            shipping_country=getattr(request.user, "country", "") or "USA",
            billing_name=request.user.get_full_name() or request.user.username,
            billing_email=request.user.email,
            billing_phone=getattr(request.user, "phone_number", "") or "",
            billing_address=getattr(request.user, "address", "") or "",
            billing_city=getattr(request.user, "city", "") or "",
            billing_state=getattr(request.user, "state", "") or "",
            billing_postal_code=getattr(request.user, "postal_code", "") or "",
            billing_country=getattr(request.user, "country", "") or "USA",
        )

        OrderItem.objects.create(
            order=order,
            product=bargain.product,
            seller=bargain.seller,
            quantity=bargain.quantity,
            price_at_time=final_price,
            total_price=total_amount,
        )

        Payment.objects.create(
            order=order,
            payment_method="credit_card",  # Default for online
            amount=total_amount,
            status="pending",
        )

    # In a real application, you would redirect to a payment gateway
    # For now, we'll simulate it with a simple payment page
    context = {
        "order": order,
        "bargain": bargain,
        "amount": total_amount,
    }
    return render(request, "bargaining/online_payment.html", context)


@login_required
def add_money_to_wallet(request):
    """Add money to user's CrazyCart wallet"""
    if request.method == "POST":
        try:
            amount = Decimal(request.POST.get("amount", 0))
            if amount <= 0:
                messages.error(request, "Invalid amount")
                return redirect("accounts:profile")

            # In a real app, you'd process payment here
            # For now, we'll just add the money (simulate successful payment)
            request.user.crazycart_balance += amount
            request.user.save()

            messages.success(request, f"৳{amount} added to your wallet successfully!")

        except ValueError:
            messages.error(request, "Invalid amount format")

        return redirect("accounts:profile")

    return render(request, "bargaining/add_money.html")
