from django.urls import path
from . import views

app_name = 'cart'

urlpatterns = [
    path('', views.cart_view, name='cart'),
    path('add/', views.add_to_cart, name='add_to_cart'),
    path('update/', views.update_cart_item, name='update_cart_item'),
    path('remove/', views.remove_from_cart, name='remove_from_cart'),
    path('clear/', views.clear_cart, name='clear_cart'),
    path('checkout/', views.checkout_view, name='checkout'),
    path('online-checkout/', views.online_checkout_view, name='online_checkout'),
    path('buy-now/', views.buy_now_view, name='buy_now'),
    path('buy-now/checkout/', views.buy_now_checkout_view, name='buy_now_checkout'),
    path('apply-discount/', views.apply_discount_to_cart, name='apply_discount'),
]
