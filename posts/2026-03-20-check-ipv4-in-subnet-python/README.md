# How to Check If an IPv4 Address Is in a Given Subnet in Python

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Python, IPv4, Subnets, CIDR, Ipaddress, Networking

Description: Learn how to check whether an IPv4 address belongs to a given subnet in Python using the ipaddress module, with practical examples for firewall rules, access control, and network segmentation.

## Basic Subnet Membership

```python
import ipaddress

def is_in_subnet(ip: str, cidr: str) -> bool:
    """Return True if ip belongs to the CIDR network."""
    try:
        addr = ipaddress.IPv4Address(ip)
        net  = ipaddress.IPv4Network(cidr, strict=False)
        return addr in net
    except ValueError:
        return False

print(is_in_subnet("192.168.1.50", "192.168.1.0/24"))  # True
print(is_in_subnet("192.168.2.1",  "192.168.1.0/24"))  # False
print(is_in_subnet("10.0.0.1",     "10.0.0.0/8"))      # True
print(is_in_subnet("8.8.8.8",      "10.0.0.0/8"))      # False
```

## Checking Against Multiple Subnets

```python
import ipaddress
from typing import Optional

TRUSTED_SUBNETS = [
    ipaddress.IPv4Network("10.0.0.0/8"),
    ipaddress.IPv4Network("172.16.0.0/12"),
    ipaddress.IPv4Network("192.168.0.0/16"),
]

def is_trusted(ip: str) -> bool:
    """Return True if ip is in any of the trusted subnets."""
    try:
        addr = ipaddress.IPv4Address(ip)
        return any(addr in net for net in TRUSTED_SUBNETS)
    except ValueError:
        return False

print(is_trusted("192.168.1.100"))  # True
print(is_trusted("10.10.10.10"))    # True
print(is_trusted("8.8.8.8"))        # False

def find_subnet(ip: str) -> Optional[ipaddress.IPv4Network]:
    """Return the first matching subnet or None."""
    try:
        addr = ipaddress.IPv4Address(ip)
        return next((net for net in TRUSTED_SUBNETS if addr in net), None)
    except ValueError:
        return None

print(find_subnet("192.168.1.50"))  # 192.168.0.0/16
```

## Flask Middleware: IP Allow-List

```python
from flask import Flask, request, abort
import ipaddress

app = Flask(__name__)

ALLOWED_CIDRS = [
    ipaddress.IPv4Network("192.168.1.0/24"),
    ipaddress.IPv4Network("10.0.0.0/8"),
]

def get_client_ip() -> str:
    return request.remote_addr or ""

@app.before_request
def check_ip():
    ip_str = get_client_ip()
    try:
        addr = ipaddress.IPv4Address(ip_str)
        if not any(addr in net for net in ALLOWED_CIDRS):
            abort(403, f"Access denied for {ip_str}")
    except ValueError:
        abort(400, "Invalid client IP")
```

## Subnet Containment (Is One Subnet Inside Another?)

```python
import ipaddress

def subnet_contains(parent_cidr: str, child_cidr: str) -> bool:
    """Return True if child_cidr is entirely within parent_cidr."""
    parent = ipaddress.IPv4Network(parent_cidr, strict=False)
    child  = ipaddress.IPv4Network(child_cidr, strict=False)
    return child.subnet_of(parent)

print(subnet_contains("10.0.0.0/8",  "10.1.0.0/16"))  # True
print(subnet_contains("10.0.0.0/16", "10.1.0.0/16"))  # False (sibling)
print(subnet_contains("10.1.0.0/16", "10.0.0.0/8"))   # False (parent/child reversed)
```

## Conclusion

The `in` operator between an `IPv4Address` and an `IPv4Network` is the cleanest way to test subnet membership. For access control lists, build `IPv4Network` objects once at startup and iterate them for each request. In Flask, use `request.remote_addr` for client checks; if your app is behind a reverse proxy, configure Flask/Werkzeug to trust forwarded headers so `request.remote_addr` reflects the real client IP. The `subnet_of()` method is useful when you need to check if one CIDR block is entirely contained within another. Always wrap parsing in `try/except ValueError` to handle malformed input gracefully.
