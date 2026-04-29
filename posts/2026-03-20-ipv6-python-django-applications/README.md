# How to Handle IPv6 in Python Django Applications

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Python, Django, IPv6, Web Development, HTTP, Security

Description: Configure Django applications for IPv6 including allowed hosts, client IP extraction, logging, and database storage of IPv6 addresses.

## Django IPv6 Configuration

Configure Django's `settings.py` to allow IPv6 hosts:

```python
# settings.py

# Allow IPv6 addresses in ALLOWED_HOSTS

ALLOWED_HOSTS = [
    "localhost",
    "127.0.0.1",
    "[::1]",                        # IPv6 localhost literal
    "[2001:db8::1]",                # Your app's IPv6 literal address
    "myapp.example.com",            # Hostname served by Django
]

# Use IPv6 in database connection (PostgreSQL)
DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.postgresql",
        "HOST": "2001:db8:db::1",   # IPv6 database host
        "PORT": "5432",
        "NAME": "mydb",
        "USER": "django",
        "PASSWORD": "secret",
    }
}
```

## Running Django Dev Server on IPv6

```bash
# Run on all IPv6 interfaces
python manage.py runserver "[::]:8000"

# Run on specific IPv6 address
python manage.py runserver "[2001:db8::1]:8000"

# Access via
# http://[::1]:8000/
```

## Getting Client IPv6 Address in Django

```python
# utils/ip.py
import ipaddress
from django.http import HttpRequest

def get_client_ip(request: HttpRequest) -> str:
    """
    Extract client IP from Django request.
    Handles:
    - X-Forwarded-For (when set by a trusted proxy/load balancer)
    - X-Real-IP (when set by a trusted proxy)
    - Direct connections (REMOTE_ADDR)
    - IPv4-mapped IPv6 addresses
    """
    # Check common trusted-proxy headers first.
    for header in ["HTTP_X_FORWARDED_FOR", "HTTP_X_REAL_IP"]:
        ip_str = request.META.get(header)
        if ip_str:
            # X-Forwarded-For may contain multiple IPs; take the first
            ip_str = ip_str.split(",")[0].strip()
            break
    else:
        ip_str = request.META.get("REMOTE_ADDR", "")

    # Normalize IPv4-mapped IPv6
    try:
        ip = ipaddress.ip_address(ip_str)
        if getattr(ip, "ipv4_mapped", None):
            return str(ip.ipv4_mapped)
        return str(ip)
    except ValueError:
        return ip_str

# views.py
import ipaddress
from django.http import JsonResponse
from utils.ip import get_client_ip

def client_info(request):
    ip = get_client_ip(request)
    try:
        version = ipaddress.ip_address(ip).version
    except ValueError:
        version = None

    return JsonResponse({
        "ip": ip,
        "version": version
    })
```

## Django Model for Storing IPv6 Addresses

```python
# models.py
import ipaddress
from django.db import models
from django.core.exceptions import ValidationError
from django.core.validators import MaxValueValidator, MinValueValidator

def validate_ipv6_address(value: str):
    """Django validator for IPv6 addresses."""
    try:
        ipaddress.IPv6Address(value)
    except ValueError:
        raise ValidationError(f"'{value}' is not a valid IPv6 address")

class NetworkDevice(models.Model):
    name = models.CharField(max_length=100)
    # Store IPv6 address as text.
    ipv6_address = models.CharField(
        max_length=45,
        validators=[validate_ipv6_address],
        help_text="IPv6 address in any valid notation"
    )
    prefix_length = models.IntegerField(
        default=128,
        validators=[MinValueValidator(0), MaxValueValidator(128)],
    )

    def save(self, *args, **kwargs):
        """Normalize IPv6 address to compressed form before saving."""
        if self.ipv6_address:
            try:
                self.ipv6_address = str(ipaddress.IPv6Address(self.ipv6_address))
            except ValueError:
                pass  # Validator will catch this

        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.name} [{self.ipv6_address}/{self.prefix_length}]"

    class Meta:
        db_table = "network_devices"
```

## Django REST Framework with IPv6

```python
# serializers.py
from rest_framework import serializers
import ipaddress

class IPv6AddressField(serializers.CharField):
    """DRF field that validates and normalizes IPv6 addresses."""

    def to_internal_value(self, data: str) -> str:
        value = super().to_internal_value(data)
        try:
            addr = ipaddress.IPv6Address(value)
            return str(addr.compressed)
        except ValueError:
            raise serializers.ValidationError("Invalid IPv6 address")

class DeviceSerializer(serializers.Serializer):
    name = serializers.CharField(max_length=100)
    ipv6_address = IPv6AddressField()
    prefix_length = serializers.IntegerField(min_value=0, max_value=128)
```

## Handling IPv6 in Django Middleware

```python
# middleware.py
import ipaddress
import logging
from utils.ip import get_client_ip

logger = logging.getLogger(__name__)

class IPv6LoggingMiddleware:
    """Log all requests with IPv6 address information."""

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        ip = get_client_ip(request)
        try:
            version = f"IPv{ipaddress.ip_address(ip).version}"
        except ValueError:
            version = "Unknown"

        response = self.get_response(request)

        logger.info(
            "%s %s %s %d [%s]",
            version, request.method, request.path,
            response.status_code, ip
        )
        return response
```

## Conclusion

Django handles IPv6 natively when configured correctly. Key steps are adding IPv6 host literals to `ALLOWED_HOSTS`, running the server bound to an IPv6 address such as `::`, and normalizing IPv4-mapped addresses in client IP extraction. Model validation and DRF serializers handle IPv6 address validation and storage cleanly.
