# How to Pass IPv6 Client IP Through Reverse Proxies

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, Reverse Proxy, X-Forwarded-For, Client IP, Nginx, HAProxy

Description: Configure reverse proxies to correctly pass IPv6 client addresses in X-Forwarded-For headers and handle multi-proxy chains with IPv6 addresses.

## Introduction

When a reverse proxy sits between an IPv6 client and an application, the application sees the proxy's IP as the client IP rather than the real user address. X-Forwarded-For and X-Real-IP headers carry the original client IPv6 address to the backend. Correct configuration requires both the proxy to send the header and the application to trust and parse it.

## Nginx: Pass IPv6 Client IP

```nginx
# /etc/nginx/conf.d/proxy-headers.conf

server {
    listen [::]:443 ssl;
    listen 443 ssl;

    location / {
        proxy_pass http://backend:8080;

        # $remote_addr contains the client IPv6 address
        # Set X-Forwarded-For with the client IP
        proxy_set_header X-Forwarded-For   $remote_addr;
        proxy_set_header X-Real-IP         $remote_addr;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Host              $host;

        # DO NOT use $proxy_add_x_forwarded_for if you want a clean single IP
        # proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        # This appends to existing header - use when chaining proxies
    }
}
```

## HAProxy: Pass IPv6 Client IP

```haproxy
# /etc/haproxy/haproxy.cfg

frontend web
    bind [::]:80
    bind [::]:443 ssl crt /etc/ssl/certs/app.pem

    # Insert X-Forwarded-For with client IPv6 address
    option forwardfor

    # Override to always use real client IP
    http-request set-header X-Real-IP %[src]
    http-request set-header X-Forwarded-For %[src]

    default_backend app

backend app
    server app1 10.0.0.1:8080
    server app2 [2001:db8::10]:8080
```

## Multi-Proxy Chain

When there are multiple proxies, each adds to X-Forwarded-For:

```text
Client (2001:db8::1) → CDN → Load Balancer → App Server
X-Forwarded-For: 2001:db8::1, 203.0.113.5
                 ^client       ^CDN IP
```

```nginx
# Application server (final proxy): extract real client from chain

# Nginx configuration to handle multi-proxy X-Forwarded-For

# Trusted proxies (load balancer IPs)
set_real_ip_from 10.0.0.0/8;
set_real_ip_from fd00::/8;
set_real_ip_from 2001:db8:abcd::/48;

# Get the leftmost untrusted IP as the real client IP
real_ip_header X-Forwarded-For;
real_ip_recursive on;
# real_ip_recursive=on: walk the list right-to-left, stop at first untrusted
```

## Application: Parse IPv6 from X-Forwarded-For

```python
#!/usr/bin/env python3
# parse_xff_ipv6.py

import ipaddress
from flask import request

# Trusted proxy CIDRs
TRUSTED_PROXIES = [
    ipaddress.ip_network("10.0.0.0/8"),
    ipaddress.ip_network("fd00::/8"),
    ipaddress.ip_network("2001:db8:abcd::/48"),
]

def is_trusted_proxy(ip_str: str) -> bool:
    try:
        ip = ipaddress.ip_address(ip_str.strip('[]'))
        return any(ip in net for net in TRUSTED_PROXIES)
    except ValueError:
        return False

def get_real_client_ip() -> str:
    """Extract real client IP from X-Forwarded-For, handling IPv6."""
    xff = request.headers.get('X-Forwarded-For', '')

    if xff:
        # Walk from right (most recent proxy) to left
        # Find the first IP that is NOT a trusted proxy
        ips = [ip.strip().strip('[]') for ip in xff.split(',')]
        for ip in reversed(ips):
            if not is_trusted_proxy(ip):
                try:
                    return str(ipaddress.ip_address(ip))
                except ValueError:
                    continue

    # Fallback to remote_addr
    remote = request.remote_addr or ''
    # Strip brackets from IPv6 socket address
    remote = remote.strip('[]').split('%')[0]
    try:
        return str(ipaddress.ip_address(remote))
    except ValueError:
        return remote

# Usage in Flask
@app.route('/api/whoami')
def whoami():
    client_ip = get_real_client_ip()
    ip_version = 6 if ':' in client_ip else 4
    return {
        "ip": client_ip,
        "ip_version": ip_version
    }
```

## Verification

```bash
# Test that IPv6 client IP is passed correctly
# Send request from IPv6 client and check application sees it

# From IPv6 client:
curl -6 -H "Host: app.example.com" \
    "https://app.example.com/api/whoami"
# Expected: {"ip": "2001:db8::1", "ip_version": 6}

# Check Nginx passes correct header:
curl -6 -v https://app.example.com/ 2>&1 | grep "X-Forwarded-For\|X-Real-IP"

# Check application logs show IPv6 address:
tail -f /var/log/app.log | grep -E '[0-9a-fA-F:]{3,39}'
```

## Common Mistakes

| Mistake | Problem | Fix |
|---------|---------|-----|
| Trusting all X-Forwarded-For headers | IP spoofing possible | Only trust from known proxy CIDRs |
| Using `$proxy_add_x_forwarded_for` without restricting it | Attacker can spoof by sending fake XFF | Use `$remote_addr` to replace entire header |
| Parsing XFF as simple string | Fails for IPv6 with colons | Use `ipaddress` module for validation |
| VARCHAR(15) for client IP storage | IPv6 addresses don't fit | Use VARCHAR(45) or `inet` type |

## Conclusion

Passing IPv6 client IP through reverse proxies requires the proxy to set `X-Forwarded-For` with `$remote_addr` (Nginx) or `option forwardfor` (HAProxy), and applications to parse the header correctly. The key challenge is handling multi-proxy chains where IPv6 addresses with colons appear alongside IPv4 addresses. Always validate IP addresses with `ipaddress.ip_address()` rather than regex parsing, and strip brackets from URI-format IPv6 addresses before parsing. Only trust `X-Forwarded-For` values from known proxy CIDR ranges to prevent IP spoofing.
