from django.contrib import admin

from orders.models import Order

# Register your models here.

@admin.register(Order)
class OrderAdmin(admin.ModelAdmin):
    list_display = ("id", "user", "created_at", "updated_at", "status")
    list_filter = ("status", "created_at", "updated_at")
    search_fields = ("user__username", "id")
    ordering = ("-created_at",)