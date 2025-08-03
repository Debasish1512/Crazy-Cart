from django.db import models
from django.conf import settings
from products.models import Product, Discount

class Cart(models.Model):
    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='cart')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    def __str__(self):
        return f"Cart for {self.user.username}"
    
    @property
    def total_items(self):
        return sum(item.quantity for item in self.items.all())
    
    @property
    def subtotal(self):
        return sum(item.total_price for item in self.items.all())
    
    @property
    def total_price(self):
        subtotal = self.subtotal
        if hasattr(self, 'applied_discount') and self.applied_discount:
            applied_discount = self.applied_discount
            discount = applied_discount.discount
            if discount.discount_type == 'percentage':
                discount_amount = subtotal * (discount.discount_value / 100)
                if discount.maximum_discount_amount:
                    discount_amount = min(discount_amount, discount.maximum_discount_amount)
            else:
                discount_amount = discount.discount_value
            return max(0, subtotal - discount_amount)
        return subtotal
    
    @property
    def total_amount(self):
        """Alias for total_price for backward compatibility"""
        return self.total_price
    
    @property
    def discount_amount(self):
        subtotal = self.subtotal
        if hasattr(self, 'applied_discount') and self.applied_discount:
            applied_discount = self.applied_discount
            discount = applied_discount.discount
            if discount.discount_type == 'percentage':
                discount_amount = subtotal * (discount.discount_value / 100)
                if discount.maximum_discount_amount:
                    discount_amount = min(discount_amount, discount.maximum_discount_amount)
            else:
                discount_amount = discount.discount_value
            return discount_amount
        return 0

class CartItem(models.Model):
    cart = models.ForeignKey(Cart, on_delete=models.CASCADE, related_name='items')
    product = models.ForeignKey(Product, on_delete=models.CASCADE)
    quantity = models.PositiveIntegerField(default=1)
    price_at_time = models.DecimalField(max_digits=10, decimal_places=2)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        unique_together = ('cart', 'product')
    
    def __str__(self):
        return f"{self.quantity} x {self.product.name} in {self.cart.user.username}'s cart"
    
    @property
    def total_price(self):
        return self.quantity * self.price_at_time
    
    def save(self, *args, **kwargs):
        if not self.price_at_time:
            self.price_at_time = self.product.price
        super().save(*args, **kwargs)

class AppliedDiscount(models.Model):
    cart = models.OneToOneField(Cart, on_delete=models.CASCADE, related_name='applied_discount')
    discount = models.ForeignKey(Discount, on_delete=models.CASCADE)
    applied_at = models.DateTimeField(auto_now_add=True)
    
    def __str__(self):
        return f"Discount {self.discount.code} applied to {self.cart.user.username}'s cart"
