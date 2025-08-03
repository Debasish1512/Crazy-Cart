from django.urls import path
from . import views

app_name = 'orders'

urlpatterns = [
    path('', views.order_list_view, name='order_list'),
    path('create/', views.create_order_view, name='create_order'),
    path('seller/orders/', views.seller_orders_view, name='seller_orders'),
    path('seller/orders/<str:order_number>/detail/', views.seller_order_detail_view, name='seller_order_detail'),
    path('seller/orders/<str:order_number>/update/', views.update_order_status_view, name='update_order_status'),
    path('payment/process/', views.process_payment_view, name='process_payment'),
    path('payment/buy-now/', views.process_buy_now_payment_view, name='process_buy_now_payment'),
    path('payment/success/', views.payment_success_view, name='payment_success'),
    path('payment/failed/', views.payment_failed_view, name='payment_failed'),
    path('complete-cart-payment/', views.complete_cart_payment_view, name='complete_cart_payment'),
    path('<str:order_number>/', views.order_detail_view, name='order_detail'),
    path('<str:order_number>/confirm/', views.confirm_order_view, name='confirm_order'),
    path('<str:order_number>/cancel/', views.cancel_order_view, name='cancel_order'),
    path('<str:order_number>/track/', views.track_order_view, name='track_order'),
]
