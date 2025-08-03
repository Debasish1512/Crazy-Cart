from django.urls import path
from . import views

app_name = 'accounts'

urlpatterns = [
    path('login/', views.login_view, name='login'),
    path('logout/', views.logout_view, name='logout'),
    path('signup/', views.signup_view, name='signup'),
    path('profile/', views.profile_view, name='profile'),
    path('edit-profile/', views.edit_profile_view, name='edit_profile'),
    path('seller-profile/', views.seller_profile_view, name='seller_profile'),
    path('seller-dashboard/', views.seller_dashboard_view, name='seller_dashboard'),
    path('admin-dashboard/', views.admin_dashboard_view, name='admin_dashboard'),
    path('user-profile/<str:username>/', views.user_profile_public_view, name='user_profile_public'),
]
