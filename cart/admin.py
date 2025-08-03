from django.contrib import admin
from .models import Cart, CartItem, AppliedDiscount
# Register your models here.

@admin.register(CartItem)
class CartItemAdmin(admin.ModelAdmin):
    list_display = ('cart', 'product', 'quantity', 'price_at_time', 'created_at')
    search_fields = ('cart__user__username', 'product__name')
    list_filter = ('created_at',)

@admin.register(Cart)
class CartAdmin(admin.ModelAdmin):
    list_display = ('user', 'created_at')
    search_fields = ('user__username',)

@admin.register(AppliedDiscount)
class AppliedDiscountAdmin(admin.ModelAdmin):
    list_display = ('discount',)
    search_fields = ('cart__user__username', 'discount__name')

    
    def has_add_permission(self, request):
        return False