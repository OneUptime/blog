# How to Configure Django ALLOWED_HOSTS for IPv6

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Django, Python, IPv6, ALLOWED_HOSTS, Security, Setting, Host Header

Description: Configure Django's ALLOWED_HOSTS setting to correctly accept requests from IPv6 addresses and hostnames, preventing host header injection attacks in IPv6 deployments.

## Introduction

Django's `ALLOWED_HOSTS` setting validates the HTTP `Host` header to prevent host header injection. IPv6 addresses in `Host` headers use bracket notation (e.g., `[2001:db8::1]`), but the development server and some proxies vary in behavior. This post clarifies how to configure `ALLOWED_HOSTS` correctly for IPv6.

## How IPv6 Appears in Host Headers

```bash
# When a browser accesses http://[2001:db8::1]:8000/

# The HTTP Host header is:
Host: [2001:db8::1]:8000

# Django strips the port and checks:
# [2001:db8::1]   ← bracket notation

# For http://[::1]:8000/
Host: [::1]:8000
# Django checks: [::1]
```

## Step 1: ALLOWED_HOSTS Configuration

```python
# settings.py

ALLOWED_HOSTS = [
    # Domain names
    "example.com",
    "www.example.com",

    # IPv6 addresses - Django uses bracket notation
    "[2001:db8::1]",
    "[::1]",

    # IPv4 addresses
    "203.0.113.1",
    "127.0.0.1",

    # Wildcard (development only!)
    # "*",
]
```

## Step 2: Dynamic ALLOWED_HOSTS from Environment

```python
# settings.py
import os

def parse_allowed_hosts(hosts_str: str) -> list:
    """
    Parse ALLOWED_HOSTS from an environment variable.
    IPv6 addresses in the env var should use bracket notation
    or plain addresses - we handle both.
    """
    hosts = []
    for host in hosts_str.split(","):
        host = host.strip()
        if not host:
            continue
        # If it's an IPv6 address without brackets, add brackets
        import ipaddress
        try:
            addr = ipaddress.ip_address(host)
            if addr.version == 6:
                hosts.append(f"[{host}]")
            else:
                hosts.append(host)
        except ValueError:
            hosts.append(host)  # hostname
    return hosts

ALLOWED_HOSTS = parse_allowed_hosts(
    os.environ.get("ALLOWED_HOSTS", "localhost,127.0.0.1,[::1]")
)
```

## Step 3: Development Server on IPv6

```bash
# Run dev server on IPv6 loopback
python manage.py runserver [::1]:8000

# Run on all IPv6 interfaces
python manage.py runserver [::]:8000

# If you bind to ::, ALLOWED_HOSTS must include the hostname or IPv6
# literal clients actually use (for example [::1] or [2001:db8::1]),
# not the bind address [::] itself.
```

## Step 4: NGINX Host Header Forwarding

```nginx
server {
    listen [::]:80;
    server_name example.com;

    location / {
        proxy_pass http://[::1]:8000;

        # Forward the original host without the port
        proxy_set_header Host $host;

        # Forward client IP separately
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

```python
# Match what NGINX forwards in the Host header.
# Use the domain for domain access and the bracketed IPv6 literal
# for direct IPv6-literal access:
ALLOWED_HOSTS = [
    "example.com",
    "[2001:db8::1]",
]
```

## Step 5: Debugging ALLOWED_HOSTS Errors

```bash
# Error: DisallowedHost: Invalid HTTP_HOST header
# Django returns HTTP 400

# Check what Host header clients are sending
python manage.py shell
>>> from django.core.exceptions import DisallowedHost
>>> from django.test import RequestFactory
>>> rf = RequestFactory()
>>> request = rf.get("/", HTTP_HOST="[2001:db8::1]:8000")
>>> # Check Django validation
>>> try:
...     request.get_host()
... except DisallowedHost as exc:
...     print(exc)
>>> from django.conf import settings
>>> settings.ALLOWED_HOSTS
```

```python
# Temporarily enable debug logging to see Host header
LOGGING = {
    "version": 1,
    "handlers": {"console": {"class": "logging.StreamHandler"}},
    "loggers": {
        "django.security.DisallowedHost": {
            "handlers": ["console"],
            "level": "ERROR",
            "propagate": False,
        },
    },
}
```

## Step 6: Testing

```python
# tests/test_hosts.py
from django.test import TestCase, Client, override_settings

@override_settings(ALLOWED_HOSTS=["[::1]", "[2001:db8::1]"])
class IPv6HostHeaderTest(TestCase):
    def test_ipv6_loopback_allowed(self):
        c = Client()
        response = c.get("/", HTTP_HOST="[::1]")
        self.assertNotEqual(response.status_code, 400)

    def test_ipv6_global_allowed(self):
        c = Client()
        response = c.get("/", HTTP_HOST="[2001:db8::1]")
        self.assertNotEqual(response.status_code, 400)

    def test_unknown_ipv6_rejected(self):
        c = Client()
        response = c.get("/", HTTP_HOST="[2001:db8::99]")
        self.assertEqual(response.status_code, 400)
```

## Conclusion

Django's `ALLOWED_HOSTS` for IPv6 requires bracket notation: `"[2001:db8::1]"`. The dev server and reverse proxies should forward the host Django will validate, so `ALLOWED_HOSTS` matches what Django receives. Use `parse_allowed_hosts()` to dynamically build the list from environment variables. Use OneUptime to continuously check that IPv6 endpoints return 200 and not 400 DisallowedHost errors.
