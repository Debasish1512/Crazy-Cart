from django.db import models
from django.conf import settings
from products.models import Product

class BargainRequest(models.Model):
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('accepted', 'Accepted'),
        ('rejected', 'Rejected'),
        ('countered', 'Countered'),
        ('expired', 'Expired'),
        ('completed', 'Completed'),
    ]
    
    buyer = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='bargain_requests')
    seller = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='received_bargains')
    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name='bargain_requests')
    
    original_price = models.DecimalField(max_digits=10, decimal_places=2)
    requested_price = models.DecimalField(max_digits=10, decimal_places=2)
    current_offer = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    message = models.TextField(blank=True, null=True)
    quantity = models.PositiveIntegerField(default=1)
    
    # Auto-accept/reject settings
    expires_at = models.DateTimeField(null=True, blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    responded_at = models.DateTimeField(null=True, blank=True)
    
    class Meta:
        ordering = ['-created_at']
        # Removed unique_together constraint to allow multiple bargains with different statuses
    
    def __str__(self):
        return f"Bargain: {self.buyer.username} -> {self.seller.username} for {self.product.name}"
    
    @property
    def is_expired(self):
        from django.utils import timezone
        return self.expires_at and timezone.now() > self.expires_at
    
    @property
    def discount_percentage(self):
        if self.current_offer:
            return round(((self.original_price - self.current_offer) / self.original_price) * 100, 2)
        return round(((self.original_price - self.requested_price) / self.original_price) * 100, 2)

class BargainMessage(models.Model):
    bargain_request = models.ForeignKey(BargainRequest, on_delete=models.CASCADE, related_name='messages')
    sender = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    message = models.TextField()
    offered_price = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    is_counter_offer = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['created_at']
    
    def __str__(self):
        return f"Message from {self.sender.username} in bargain for {self.bargain_request.product.name}"

class BargainSettings(models.Model):
    """Seller's bargaining preferences"""
    seller = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='bargain_settings')
    
    # Auto-response settings
    enable_auto_accept = models.BooleanField(default=False)
    auto_accept_threshold = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True, 
                                              help_text="Auto-accept if discount is less than this percentage")
    
    enable_auto_reject = models.BooleanField(default=False)
    auto_reject_threshold = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True,
                                              help_text="Auto-reject if discount is more than this percentage")
    
    # Response time settings
    default_response_time_hours = models.PositiveIntegerField(default=24)
    
    # Counter-offer settings
    enable_auto_counter = models.BooleanField(default=False)
    counter_offer_percentage = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True,
                                                 help_text="Automatically counter with this percentage discount")
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    def __str__(self):
        return f"Bargain settings for {self.seller.username}"
