from django import template

register = template.Library()


@register.filter
def multiply(value, arg):
    """Multiply a value by an argument"""
    try:
        return float(value) * float(arg)
    except (ValueError, TypeError):
        return 0
