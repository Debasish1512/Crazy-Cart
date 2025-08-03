from django.urls import path
from . import views

app_name = "products"

urlpatterns = [
    path("", views.product_list_view, name="product_list"),
    path(
        "category/<slug:category_slug>/",
        views.product_list_view,
        name="product_list_by_category",
    ),
    path("search/", views.product_search_view, name="product_search"),
    path("add/", views.add_product_view, name="add_product"),
    path("wishlist/", views.wishlist_view, name="wishlist"),
    path("wishlist/add/", views.add_to_wishlist, name="add_to_wishlist"),
    path("wishlist/remove/", views.remove_from_wishlist, name="remove_from_wishlist"),
    path("my-products/", views.seller_products_view, name="seller_products"),
    path("discount/apply/", views.apply_discount_view, name="apply_discount"),
    path("image/delete/", views.delete_product_image, name="delete_product_image"),
    path("about-us/", views.about_us, name="about_us"),
    path("<slug:slug>/", views.product_detail_view, name="product_detail"),
    path("<slug:slug>/edit/", views.edit_product_view, name="edit_product"),
    path("<slug:slug>/delete/", views.delete_product_view, name="delete_product"),
    path("<slug:slug>/review/", views.add_review_view, name="add_review"),
]
