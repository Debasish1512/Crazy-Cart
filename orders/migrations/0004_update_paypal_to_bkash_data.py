# Generated manually to update existing PayPal records to bKash

from django.db import migrations


def update_paypal_to_bkash(apps, schema_editor):
    Payment = apps.get_model("orders", "Payment")
    Payment.objects.filter(payment_method="paypal").update(payment_method="bkash")


def reverse_bkash_to_paypal(apps, schema_editor):
    Payment = apps.get_model("orders", "Payment")
    Payment.objects.filter(payment_method="bkash").update(payment_method="paypal")


class Migration(migrations.Migration):

    dependencies = [
        ("orders", "0003_change_paypal_to_bkash"),
    ]

    operations = [
        migrations.RunPython(update_paypal_to_bkash, reverse_bkash_to_paypal),
    ]
