from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from .models import User, UserProfile, SellerProfile

@admin.register(User)
class CustomUserAdmin(UserAdmin):
    list_display = ('username', 'email', 'user_type', 'crazycart_balance', 'is_active', 'date_joined')
    list_filter = ('user_type', 'is_active', 'is_staff', 'date_joined')
    search_fields = ('username', 'email', 'first_name', 'last_name')
    ordering = ('-date_joined',)
    
    fieldsets = UserAdmin.fieldsets + (
        ('CrazyCart Info', {
            'fields': ('user_type', 'phone_number', 'address', 'city', 'state', 
                      'postal_code', 'country', 'crazycart_balance')
        }),
    )

@admin.register(UserProfile)
class UserProfileAdmin(admin.ModelAdmin):
    list_display = ('user', 'birth_date', 'website')
    search_fields = ('user__username', 'user__email')

@admin.register(SellerProfile)
class SellerProfileAdmin(admin.ModelAdmin):
    list_display = ('business_name', 'user', 'rating', 'total_sales', 'is_verified', 'created_at')
    list_filter = ('is_verified', 'rating', 'created_at')
    search_fields = ('business_name', 'user__username', 'business_license')
    readonly_fields = ('rating', 'total_sales')
