from django import template
from decimal import Decimal

register = template.Library()


@register.filter
def discount_percentage(original_price, current_price):
    """Calculate discount percentage between original and current price"""
    try:
        if not original_price or not current_price:
            return 0

        original = float(original_price)
        current = float(current_price)

        if original <= current:
            return 0

        discount = ((original - current) / original) * 100
        return int(round(discount))
    except (ValueError, TypeError, ZeroDivisionError):
        return 0


@register.filter
def subtract(value, arg):
    """Subtract arg from value"""
    try:
        return float(value) - float(arg)
    except (ValueError, TypeError):
        return 0
