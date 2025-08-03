from django.db import models
from django.conf import settings
from products.models import Product, Discount
import uuid


class Order(models.Model):
    STATUS_CHOICES = [
        ("pending", "Pending"),
        ("confirmed", "Confirmed"),
        ("processing", "Processing"),
        ("shipped", "Shipped"),
        ("delivered", "Delivered"),
        ("cancelled", "Cancelled"),
        ("refunded", "Refunded"),
    ]

    PAYMENT_STATUS_CHOICES = [
        ("pending", "Pending"),
        ("paid", "Paid"),
        ("failed", "Failed"),
        ("refunded", "Refunded"),
    ]

    order_number = models.CharField(max_length=32, unique=True, blank=True)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="orders"
    )
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="pending")
    payment_status = models.CharField(
        max_length=20, choices=PAYMENT_STATUS_CHOICES, default="pending"
    )

    # Pricing
    subtotal = models.DecimalField(max_digits=10, decimal_places=2)
    discount_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    tax_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    shipping_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    total_amount = models.DecimalField(max_digits=10, decimal_places=2)

    # Shipping Information
    shipping_name = models.CharField(max_length=100)
    shipping_email = models.EmailField()
    shipping_phone = models.CharField(max_length=15)
    shipping_address = models.TextField()
    shipping_city = models.CharField(max_length=100)
    shipping_state = models.CharField(max_length=100)
    shipping_postal_code = models.CharField(max_length=10)
    shipping_country = models.CharField(max_length=100)

    # Billing Information (can be same as shipping)
    billing_name = models.CharField(max_length=100)
    billing_email = models.EmailField()
    billing_phone = models.CharField(max_length=15)
    billing_address = models.TextField()
    billing_city = models.CharField(max_length=100)
    billing_state = models.CharField(max_length=100)
    billing_postal_code = models.CharField(max_length=10)
    billing_country = models.CharField(max_length=100)

    # Applied discount
    applied_discount = models.ForeignKey(
        Discount, on_delete=models.SET_NULL, null=True, blank=True
    )

    # Tracking
    tracking_number = models.CharField(max_length=100, blank=True, null=True)
    estimated_delivery = models.DateTimeField(blank=True, null=True)

    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    shipped_at = models.DateTimeField(blank=True, null=True)
    delivered_at = models.DateTimeField(blank=True, null=True)

    class Meta:
        ordering = ["-created_at"]

    def save(self, *args, **kwargs):
        if not self.order_number:
            self.order_number = str(uuid.uuid4()).replace("-", "").upper()[:16]
        super().save(*args, **kwargs)

    def __str__(self):
        return f"Order #{self.order_number} - {self.user.username}"


class OrderItem(models.Model):
    order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name="items")
    product = models.ForeignKey(Product, on_delete=models.CASCADE)
    seller = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="sold_items"
    )
    quantity = models.PositiveIntegerField()
    price_at_time = models.DecimalField(max_digits=10, decimal_places=2)
    total_price = models.DecimalField(max_digits=10, decimal_places=2)

    # Individual item status (for multi-seller orders)
    status = models.CharField(
        max_length=20, choices=Order.STATUS_CHOICES, default="pending"
    )
    tracking_number = models.CharField(max_length=100, blank=True, null=True)
    shipped_at = models.DateTimeField(blank=True, null=True)
    delivered_at = models.DateTimeField(blank=True, null=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return (
            f"{self.quantity} x {self.product.name} - Order #{self.order.order_number}"
        )

    def save(self, *args, **kwargs):
        if not self.total_price:
            self.total_price = self.quantity * self.price_at_time
        super().save(*args, **kwargs)


class Payment(models.Model):
    PAYMENT_METHOD_CHOICES = [
        ("crazycart_wallet", "CrazyCart Wallet"),
        ("credit_card", "Credit Card"),
        ("debit_card", "Debit Card"),
        ("bkash", "bKash"),
        ("bank_transfer", "Bank Transfer"),
        ("cash_on_delivery", "Cash on Delivery"),
        ("upi", "UPI"),
    ]

    order = models.OneToOneField(
        Order, on_delete=models.CASCADE, related_name="payment"
    )
    payment_method = models.CharField(max_length=20, choices=PAYMENT_METHOD_CHOICES)
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    transaction_id = models.CharField(max_length=100, unique=True, blank=True)
    status = models.CharField(
        max_length=20, choices=Order.PAYMENT_STATUS_CHOICES, default="pending"
    )
    gateway_response = models.JSONField(blank=True, null=True)
    processed_at = models.DateTimeField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def save(self, *args, **kwargs):
        if not self.transaction_id:
            self.transaction_id = (
                f"TXN-{str(uuid.uuid4()).replace('-', '').upper()[:12]}"
            )
        super().save(*args, **kwargs)

    def __str__(self):
        return f"Payment for Order #{self.order.order_number} - {self.amount} CC"


class OrderTracking(models.Model):
    order = models.ForeignKey(
        Order, on_delete=models.CASCADE, related_name="tracking_updates"
    )
    status = models.CharField(max_length=20, choices=Order.STATUS_CHOICES)
    message = models.TextField()
    location = models.CharField(max_length=200, blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"Order #{self.order.order_number} - {self.status} at {self.created_at}"
