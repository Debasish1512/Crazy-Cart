from django.urls import path, include
from rest_framework.routers import DefaultRouter

# Create the router for API viewsets when we implement them
router = DefaultRouter()

urlpatterns = [
    path('', include(router.urls)),
    path('auth/', include('rest_framework.urls')),
]
