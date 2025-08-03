from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from products.models import Category, Product, Discount
from accounts.models import SellerProfile
from decimal import Decimal

User = get_user_model()

class Command(BaseCommand):
    help = 'Populate the database with sample data'

    def handle(self, *args, **options):
        self.stdout.write('Creating sample data...')
        
        # Create categories
        categories_data = [
            {'name': 'Electronics', 'description': 'Electronic devices and gadgets'},
            {'name': 'Fashion', 'description': 'Clothing and accessories'},
            {'name': 'Home & Garden', 'description': 'Home improvement and garden supplies'},
            {'name': 'Sports', 'description': 'Sports and fitness equipment'},
            {'name': 'Books', 'description': 'Books and educational materials'},
            {'name': 'Toys', 'description': 'Toys and games for all ages'},
        ]
        
        categories = {}
        for cat_data in categories_data:
            category, created = Category.objects.get_or_create(
                name=cat_data['name'],
                defaults={'description': cat_data['description']}
            )
            categories[cat_data['name']] = category
            if created:
                self.stdout.write(f'Created category: {category.name}')
        
        # Create sample users
        sample_users = [
            {
                'username': 'seller1',
                'email': 'seller1@example.com',
                'first_name': 'John',
                'last_name': 'Seller',
                'user_type': 'seller',
                'crazycart_balance': Decimal('100000.00')
            },
            {
                'username': 'seller2',
                'email': 'seller2@example.com',
                'first_name': 'Jane',
                'last_name': 'Store',
                'user_type': 'seller',
                'crazycart_balance': Decimal('110000.00')
            },
            {
                'username': 'buyer1',
                'email': 'buyer1@example.com',
                'first_name': 'Alice',
                'last_name': 'Johnson',
                'user_type': 'buyer',
                'crazycart_balance': Decimal('55000.00')
            },
            {
                'username': 'buyer2',
                'email': 'buyer2@example.com',
                'first_name': 'Bob',
                'last_name': 'Customer',
                'user_type': 'buyer',
                'crazycart_balance': Decimal('82500.00')
            }
        ]
        
        users = {}
        for user_data in sample_users:
            user, created = User.objects.get_or_create(
                username=user_data['username'],
                defaults={
                    'email': user_data['email'],
                    'first_name': user_data['first_name'],
                    'last_name': user_data['last_name'],
                    'user_type': user_data['user_type'],
                    'crazycart_balance': user_data['crazycart_balance']
                }
            )
            if created:
                user.set_password('password123')
                user.save()
                self.stdout.write(f'Created user: {user.username}')
            users[user_data['username']] = user
        
        # Create seller profiles
        for username in ['seller1', 'seller2']:
            user = users[username]
            if hasattr(user, 'seller_profile'):
                continue
            
            profile, created = SellerProfile.objects.get_or_create(
                user=user,
                defaults={
                    'business_name': f"{user.first_name}'s Store",
                    'business_description': f"Quality products from {user.first_name}",
                    'business_license': 'BL123456789',
                    'tax_id': 'TAX123456789'
                }
            )
            if created:
                self.stdout.write(f'Created seller profile for: {user.username}')
        
        # Create sample products
        products_data = [
            {
                'name': 'iPhone 15 Pro',
                'category': 'Electronics',
                'seller': 'seller1',
                'description': 'Latest iPhone with amazing features. Barely used, in excellent condition.',
                'price': Decimal('109999.00'),
                'original_price': Decimal('131999.00'),
                'condition': 'used_like_new',
                'stock_quantity': 3,
                'brand': 'Apple',
                'allow_bargaining': True,
                'minimum_bargain_price': Decimal('99000.00')
            },
            {
                'name': 'Samsung Galaxy S24',
                'category': 'Electronics',
                'seller': 'seller2',
                'description': 'Brand new Samsung Galaxy S24 with warranty.',
                'price': Decimal('93499.00'),
                'condition': 'new',
                'stock_quantity': 5,
                'brand': 'Samsung',
                'allow_bargaining': True,
                'minimum_bargain_price': Decimal('88000.00')
            },
            {
                'name': 'Nike Air Max 90',
                'category': 'Fashion',
                'seller': 'seller1',
                'description': 'Classic Nike Air Max sneakers. Size 10.',
                'price': Decimal('13200.00'),
                'original_price': Decimal('15400.00'),
                'condition': 'new',
                'stock_quantity': 10,
                'brand': 'Nike',
                'size': '10',
                'color': 'White/Black',
                'allow_bargaining': True,
                'minimum_bargain_price': Decimal('11000.00')
            },
            {
                'name': 'Gaming Chair',
                'category': 'Home & Garden',
                'seller': 'seller2',
                'description': 'Comfortable gaming chair with lumbar support.',
                'price': Decimal('32999.00'),
                'condition': 'new',
                'stock_quantity': 7,
                'brand': 'DXRacer',
                'allow_bargaining': True,
                'minimum_bargain_price': Decimal('27500.00')
            },
            {
                'name': 'Tennis Racket',
                'category': 'Sports',
                'seller': 'seller1',
                'description': 'Professional tennis racket. Slightly used but in great condition.',
                'price': Decimal('9350.00'),
                'original_price': Decimal('13200.00'),
                'condition': 'used_good',
                'stock_quantity': 2,
                'brand': 'Wilson',
                'allow_bargaining': True,
                'minimum_bargain_price': Decimal('7700.00')
            },
            {
                'name': 'Python Programming Book',
                'category': 'Books',
                'seller': 'seller2',
                'description': 'Complete guide to Python programming. Perfect for beginners.',
                'price': Decimal('4950.00'),
                'condition': 'used_like_new',
                'stock_quantity': 15,
                'allow_bargaining': True,
                'minimum_bargain_price': Decimal('3850.00')
            }
        ]
        
        for product_data in products_data:
            product, created = Product.objects.get_or_create(
                name=product_data['name'],
                defaults={
                    'category': categories[product_data['category']],
                    'seller': users[product_data['seller']],
                    'description': product_data['description'],
                    'price': product_data['price'],
                    'original_price': product_data.get('original_price'),
                    'condition': product_data['condition'],
                    'stock_quantity': product_data['stock_quantity'],
                    'brand': product_data.get('brand'),
                    'size': product_data.get('size'),
                    'color': product_data.get('color'),
                    'allow_bargaining': product_data['allow_bargaining'],
                    'minimum_bargain_price': product_data.get('minimum_bargain_price'),
                    'is_featured': True if product_data['name'] in ['iPhone 15 Pro', 'Gaming Chair'] else False
                }
            )
            if created:
                self.stdout.write(f'Created product: {product.name}')
        
        # Create sample discounts
        discounts_data = [
            {
                'code': 'WELCOME10',
                'name': '10% Off First Order',
                'description': '10% discount for new customers',
                'discount_type': 'percentage',
                'discount_value': Decimal('10.00'),
                'minimum_order_amount': Decimal('5500.00'),
                'maximum_discount_amount': Decimal('11000.00'),
                'usage_limit': 100,
                'valid_from': '2025-01-01 00:00:00',
                'valid_until': '2025-12-31 23:59:59'
            },
            {
                'code': 'SAVE20',
                'name': '৳2200 Off Large Orders',
                'description': '৳2200 off orders over ৳22000',
                'discount_type': 'fixed',
                'discount_value': Decimal('2200.00'),
                'minimum_order_amount': Decimal('22000.00'),
                'usage_limit': 50,
                'valid_from': '2025-01-01 00:00:00',
                'valid_until': '2025-12-31 23:59:59'
            }
        ]
        
        from django.utils.dateparse import parse_datetime
        
        for discount_data in discounts_data:
            discount, created = Discount.objects.get_or_create(
                code=discount_data['code'],
                defaults={
                    'name': discount_data['name'],
                    'description': discount_data['description'],
                    'discount_type': discount_data['discount_type'],
                    'discount_value': discount_data['discount_value'],
                    'minimum_order_amount': discount_data['minimum_order_amount'],
                    'maximum_discount_amount': discount_data.get('maximum_discount_amount'),
                    'usage_limit': discount_data['usage_limit'],
                    'valid_from': parse_datetime(discount_data['valid_from']),
                    'valid_until': parse_datetime(discount_data['valid_until']),
                    'is_active': True
                }
            )
            if created:
                self.stdout.write(f'Created discount: {discount.code}')
        
        self.stdout.write(self.style.SUCCESS('Sample data created successfully!'))
