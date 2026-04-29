# How to Configure IPv6 in Python Django Applications

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, Python, Django, Web Framework, Dual-Stack

Description: Configure Django to handle IPv6 clients, validate IPv6 addresses in models and forms, deploy with IPv6-capable servers, and handle dual-stack environments correctly.

## Run Django Dev Server on IPv6

```bash
# Django's manage.py runserver supports IPv6 directly

python manage.py runserver "[::]:8000"

# IPv6 localhost only
python manage.py runserver "[::1]:8000"

# If you want separate IPv4 and IPv6 dev listeners, use different ports
python manage.py runserver "0.0.0.0:8000"   # IPv4
# Then separately:
python manage.py runserver "[::]:8001"       # IPv6
```

## Django Settings for IPv6

```python
# settings.py

# Allow the hostnames and IP literals your Django site serves
ALLOWED_HOSTS = [
    "localhost",
    "[::1]",                    # IPv6 loopback
    "[2001:db8::1]",            # specific IPv6 host
    "example.com",
    ".example.com",             # all subdomains
]

# For development - allow all
# ALLOWED_HOSTS = ["*"]

# If you're behind a trusted proxy, trust its HTTPS indicator
SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")
```

## IPv6 Address in Django Models

```python
from django.db import models
from django.core.validators import validate_ipv46_address
import ipaddress

class NetworkDevice(models.Model):
    name = models.CharField(max_length=100)

    # GenericIPAddressField handles both IPv4 and IPv6
    ipv6_address = models.GenericIPAddressField(
        protocol="IPv6",           # restrict to IPv6 only
        unpack_ipv4=False,
        blank=True, null=True,
    )

    # Or accept both IPv4 and IPv6
    management_ip = models.GenericIPAddressField(
        protocol="both",
        unpack_ipv4=True,          # normalizes ::ffff:192.168.1.1 → 192.168.1.1
        blank=True, null=True,
    )

    ipv6_prefix = models.CharField(max_length=50, blank=True)

    def clean(self):
        from django.core.exceptions import ValidationError
        if self.ipv6_prefix:
            try:
                net = ipaddress.ip_network(self.ipv6_prefix, strict=False)
                if net.version != 6:
                    raise ValidationError({"ipv6_prefix": "Must be an IPv6 prefix"})
                # Normalize
                self.ipv6_prefix = str(net)
            except ValueError as e:
                raise ValidationError({"ipv6_prefix": str(e)})

    class Meta:
        ordering = ["name"]
```

## Django Forms with IPv6 Validation

```python
from django import forms
import ipaddress

class IPv6PrefixForm(forms.Form):
    """Form for entering an IPv6 prefix."""

    prefix = forms.CharField(
        max_length=50,
        label="IPv6 Prefix (CIDR notation)",
        widget=forms.TextInput(attrs={"placeholder": "2001:db8::/32"}),
    )

    def clean_prefix(self):
        raw = self.cleaned_data["prefix"].strip()
        try:
            net = ipaddress.ip_network(raw, strict=False)
            if net.version != 6:
                raise forms.ValidationError("Please enter an IPv6 prefix, not IPv4.")
            if net.prefixlen < 8 or net.prefixlen > 128:
                raise forms.ValidationError("Prefix length must be between /8 and /128.")
            return str(net)   # normalized form
        except ValueError as e:
            raise forms.ValidationError(f"Invalid IPv6 prefix: {e}")

class IPv6AddressForm(forms.Form):
    """Form for entering a single IPv6 address."""

    address = forms.GenericIPAddressField(protocol="IPv6")
    description = forms.CharField(max_length=200, required=False)

    def clean_address(self):
        addr = self.cleaned_data["address"]
        # GenericIPAddressField already validated; normalize
        return str(ipaddress.ip_address(addr))
```

## Middleware to Log IPv6 Client Info

```python
import ipaddress
import logging

logger = logging.getLogger(__name__)

class IPv6LoggingMiddleware:
    """Log IPv6 client information for each request."""

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        client_ip = self._get_client_ip(request)
        request.client_ipv6 = client_ip

        # Log IPv6 client info
        try:
            addr = ipaddress.ip_address(client_ip)
            if addr.version == 6:
                logger.info(
                    "IPv6 request: %s -> %s (%s)",
                    addr.compressed,
                    request.path,
                    "global" if addr.is_global else "non-global",
                )
        except ValueError:
            pass

        response = self.get_response(request)
        return response

    def _get_client_ip(self, request) -> str:
        # Only trust X-Forwarded-For when your reverse proxy strips/sets it.
        xff = request.META.get("HTTP_X_FORWARDED_FOR")
        if xff:
            ip = xff.split(",")[0].strip()
        else:
            ip = request.META.get("REMOTE_ADDR", "")

        # Unwrap IPv4-mapped IPv6
        try:
            addr = ipaddress.ip_address(ip)
            if addr.version == 6 and addr.ipv4_mapped:
                return str(addr.ipv4_mapped)
        except ValueError:
            pass
        return ip

# Add to settings.py:
# MIDDLEWARE = ["myapp.middleware.IPv6LoggingMiddleware", ...]
```

## Deploy Django with Gunicorn + Nginx (IPv6)

```bash
# Gunicorn - bind to IPv6
gunicorn \
    --bind "[::]:8000" \
    --workers 4 \
    "myproject.wsgi:application"
```

```nginx
# nginx for Django IPv6
server {
    listen 80;
    listen [::]:80;
    server_name example.com;

    location /static/ {
        alias /var/www/django/static/;
    }

    location / {
        proxy_pass http://[::1]:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-For $remote_addr;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

## Conclusion

Django supports IPv6 natively: `GenericIPAddressField(protocol="IPv6")` stores and validates IPv6 addresses in models; `forms.GenericIPAddressField(protocol="IPv6")` handles form validation. Run the development server on `[::]:8000` to accept IPv6 connections. List bracketed IPv6 host literals explicitly in `ALLOWED_HOSTS`. Use middleware to extract the real client IP from `X-Forwarded-For` when a trusted proxy sets it, and normalize IPv4-mapped IPv6 addresses (`::ffff:192.168.x.x`) back to IPv4 format. In production, deploy with Gunicorn `--bind "[::]:8000"` behind Nginx with `listen [::]:80` directives. Rate-limit by /64 prefix rather than individual IPv6 address to prevent trivial bypasses via address rotation within the /64.
