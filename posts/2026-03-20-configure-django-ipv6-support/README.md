# How to Configure Django for IPv6 Support

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Django, Python, IPv6, ALLOWED_HOSTS, Web Framework, WSGI, ASGI

Description: Configure Django to accept requests from IPv6 clients by updating ALLOWED_HOSTS, handling IPv6 in middleware, and deploying with an IPv6-capable application server.

## Introduction

Django has built-in IPv6 support, but non-default hosts and production deployments still need explicit configuration. The key setting is `ALLOWED_HOSTS`, which should include IPv6 literals in bracket notation because Django validates the `Host` header without the port. If you're behind a reverse proxy, handle forwarded client IP headers carefully. Production deployments need an IPv6-capable WSGI or ASGI server such as Gunicorn or Uvicorn.

## Step 1: ALLOWED_HOSTS for IPv6

```python
# settings.py

# Allow IPv6 addresses and hostnames

ALLOWED_HOSTS = [
    "example.com",
    "www.example.com",
    "[2001:db8::1]",        # Specific IPv6 literal
    "[::1]",                # Loopback
    # Wildcard for all (dev only!)
    # "*",
]

# When DEBUG=True and ALLOWED_HOSTS is empty, Django already allows
# ".localhost", "127.0.0.1", and "[::1]".
# If you access the dev server via a different IPv6 literal, add it in brackets here.
```

## Step 2: Run Django Dev Server on IPv6

```bash
# Listen on all IPv6 interfaces
python manage.py runserver "[::]:8000"

# Listen on loopback IPv6 only
python manage.py runserver "[::1]:8000"

# Listen on specific IPv6 address
python manage.py runserver "[2001:db8::1]:8000"
```

## Step 3: Middleware for IPv6 Client IP Behind a Trusted Proxy

```python
# myapp/middleware.py

import ipaddress
from django.http import HttpRequest

class IPv6ClientMiddleware:
    """
    Normalize client IP addresses. Only trust X-Forwarded-For from a proxy you control.
    """
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request: HttpRequest):
        # Start with the direct client address provided by the server.
        ip = request.META.get("REMOTE_ADDR", "")

        # If you're behind a trusted reverse proxy, use the left-most forwarded IP.
        xff = request.META.get("HTTP_X_FORWARDED_FOR", "")
        if xff:
            ip = xff.split(",")[0].strip().strip("[]")

        # Normalize IPv6
        try:
            addr = ipaddress.ip_address(ip)
            request.client_ip = str(addr)
            request.client_ip_version = addr.version
        except ValueError:
            request.client_ip = ip
            request.client_ip_version = None

        return self.get_response(request)
```

```python
# settings.py
MIDDLEWARE = [
    "myapp.middleware.IPv6ClientMiddleware",
    "django.middleware.security.SecurityMiddleware",
    # ...
]
```

## Step 4: Store and Display IPv6 in Models

```python
# models.py
from django.db import models

class UserSession(models.Model):
    # GenericIPAddressField handles both IPv4 and IPv6
    ip_address = models.GenericIPAddressField(
        protocol="both",       # Accept IPv4 and IPv6
        unpack_ipv4=True,      # Unpack ::ffff:1.2.3.4 → 1.2.3.4
    )
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Session from {self.ip_address}"
```

## Step 5: Forms with IPv6 Validation

```python
# forms.py
from django import forms

class NetworkConfigForm(forms.Form):
    def __init__(self, *args, allow_loopback=True, **kwargs):
        super().__init__(*args, **kwargs)
        self.allow_loopback = allow_loopback

    ipv6_address = forms.GenericIPAddressField(
        protocol="IPv6",
        label="IPv6 Address",
    )

    def clean_ipv6_address(self):
        import ipaddress
        addr_str = self.cleaned_data["ipv6_address"]
        try:
            addr = ipaddress.IPv6Address(addr_str)
            if addr.is_loopback and not self.allow_loopback:
                raise forms.ValidationError("Loopback addresses not permitted")
            return str(addr)
        except ValueError:
            raise forms.ValidationError("Invalid IPv6 address")
```

## Step 6: Production with Gunicorn/ASGI

```bash
# Gunicorn WSGI
gunicorn myproject.wsgi:application \
    --bind "[::]:8000" \
    --workers 4

# Uvicorn ASGI (for Django Channels or async views)
uvicorn myproject.asgi:application \
    --host "::" \
    --port 8000 \
    --workers 4
```

## Step 7: CSRF and Session Cookies on IPv6

```python
# settings.py

# Keep the default host-only cookie behavior
SESSION_COOKIE_DOMAIN = None

# CSRF trusted origins - include IPv6 addresses
CSRF_TRUSTED_ORIGINS = [
    "https://example.com",
    "https://[2001:db8::1]",
    "http://[::1]:8000",
]
```

## Conclusion

Django IPv6 support requires updating `ALLOWED_HOSTS` with bracketed IPv6 literals, using `GenericIPAddressField` for storing IPs in models, and binding Gunicorn or Uvicorn to IPv6. If you're behind a reverse proxy, only trust forwarded client IP headers from proxies you control. Monitor Django with OneUptime's uptime and SSL checks on IPv6 endpoints.
