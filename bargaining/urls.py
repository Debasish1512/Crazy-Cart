from django.urls import path
from . import views

app_name = 'bargaining'

urlpatterns = [
    path('request/', views.create_bargain_request, name='create_bargain_request'),
    path('requests/', views.bargain_requests_view, name='bargain_requests'),
    path('received/', views.received_bargains_view, name='received_bargains'),
    path('<int:bargain_id>/', views.bargain_detail_view, name='bargain_detail'),
    path('<int:bargain_id>/respond/', views.respond_to_bargain, name='respond_to_bargain'),
    path('<int:bargain_id>/message/', views.add_bargain_message, name='add_bargain_message'),
    path('settings/', views.bargain_settings_view, name='bargain_settings'),
    
    # Payment URLs
    path('process-payment/<int:bargain_id>/', views.process_payment, name='process_payment'),
    path('online-payment/<int:bargain_id>/', views.online_payment, name='online_payment'),
    path('add-money/', views.add_money_to_wallet, name='add_money'),
]
