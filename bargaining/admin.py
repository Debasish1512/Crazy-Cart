from django.contrib import admin

from bargaining.models import BargainRequest

# Register your models here.

@admin.register(BargainRequest)
class BargainRequestAdmin(admin.ModelAdmin):
    list_display = ('buyer','seller', 'status', 'created_at', 'updated_at')
    search_fields = ('status',)
    list_filter = ('status', 'created_at', 'updated_at')

    def get_queryset(self, request):
        queryset = super().get_queryset(request)
        return queryset.select_related('buyer')