# How to Configure X-Real-IP Header for IPv6 Clients

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, X-Real-IP, Nginx, Reverse Proxy, Client IP, HTTP Headers

Description: Configure the X-Real-IP header to carry IPv6 client addresses through reverse proxies, and handle the differences between X-Real-IP and X-Forwarded-For in IPv6 deployments.

## Introduction

X-Real-IP is a single-IP HTTP header used by reverse proxies to forward the original client IP to backend applications. Unlike X-Forwarded-For, which accumulates IPs across a chain of proxies, X-Real-IP contains only one address - the real client. IPv6 addresses require no special encoding in X-Real-IP (no brackets), but applications must handle the colon-containing format correctly.

## Nginx: Set X-Real-IP for IPv6

```nginx
# /etc/nginx/conf.d/real-ip.conf

server {
    listen [::]:443 ssl;
    listen 443 ssl;

    location / {
        proxy_pass http://backend:8080;

        # Set X-Real-IP to the direct client address (IPv6 or IPv4)
        proxy_set_header X-Real-IP $remote_addr;

        # Also set X-Forwarded-For for compatibility
        proxy_set_header X-Forwarded-For $remote_addr;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Host $host;
    }
}
```

## Nginx: Read X-Real-IP from Upstream Proxy

When Nginx is behind another load balancer that sets X-Real-IP:

```nginx
# /etc/nginx/conf.d/trust-real-ip.conf

# Trust these upstream proxies

set_real_ip_from 10.0.0.0/8;
set_real_ip_from fd00::/8;
set_real_ip_from 2001:db8:1::/48;

# Use X-Real-IP as the real client IP source
real_ip_header X-Real-IP;

# Do NOT set real_ip_recursive here - X-Real-IP is a single value

server {
    listen [::]:80;

    location / {
        proxy_pass http://app:8080;

        # $remote_addr is now replaced with value from X-Real-IP
        proxy_set_header X-Forwarded-For $remote_addr;
        proxy_set_header X-Real-IP       $remote_addr;
    }
}
```

## HAProxy: Set X-Real-IP for IPv6

```haproxy
# /etc/haproxy/haproxy.cfg

frontend web
    bind [::]:80
    bind [::]:443 ssl crt /etc/ssl/certs/app.pem

    # Set X-Real-IP to client source address (works for IPv6)
    http-request set-header X-Real-IP %[src]
    # %[src] returns the IPv6 address without brackets

    # For X-Forwarded-For, option forwardfor is simpler:
    option forwardfor

    default_backend app

backend app
    server app1 [2001:db8::10]:8080
```

## Apache: Set and Read X-Real-IP

```apache
# /etc/apache2/conf-enabled/real-ip.conf

# mod_remoteip handles X-Real-IP (single IP, no chain)
<IfModule mod_remoteip.c>
    # Trust these IPv6 proxy CIDRs
    RemoteIPHeader X-Real-IP
    RemoteIPTrustedProxy 10.0.0.0/8
    RemoteIPTrustedProxy fd00::/8
    RemoteIPTrustedProxy 2001:db8:1::/48
</IfModule>

# Virtual host setting X-Real-IP to pass downstream
<VirtualHost [::]:443>
    ServerName app.example.com

    <Location />
        ProxyPass http://backend:8080/
        ProxyPassReverse http://backend:8080/

        # RequestHeader sets X-Real-IP to client address
        RequestHeader set X-Real-IP "expr=%{REMOTE_ADDR}"
    </Location>
</VirtualHost>
```

## Application: Read X-Real-IP Correctly

```python
#!/usr/bin/env python3
# read_real_ip.py

import ipaddress
from flask import request

TRUSTED_PROXIES_CIDR = [
    ipaddress.ip_network("10.0.0.0/8"),
    ipaddress.ip_network("fd00::/8"),
    ipaddress.ip_network("2001:db8:1::/48"),
]

def is_trusted_proxy(ip_str: str) -> bool:
    try:
        ip = ipaddress.ip_address(ip_str)
        return any(ip in net for net in TRUSTED_PROXIES_CIDR)
    except ValueError:
        return False

def get_client_ip() -> str:
    """
    Get the real client IP from X-Real-IP header.
    Falls back to X-Forwarded-For then remote_addr.
    """
    remote = request.remote_addr or ''

    # Only trust X-Real-IP if the direct connection is from a known proxy
    if is_trusted_proxy(remote):
        x_real_ip = request.headers.get('X-Real-IP', '').strip()
        if x_real_ip:
            try:
                # Validate: X-Real-IP must be a valid IP address
                return str(ipaddress.ip_address(x_real_ip))
            except ValueError:
                pass  # Invalid IP in header - fall through

        # Try X-Forwarded-For as fallback
        xff = request.headers.get('X-Forwarded-For', '')
        if xff:
            first_ip = xff.split(',')[0].strip()
            try:
                return str(ipaddress.ip_address(first_ip))
            except ValueError:
                pass

    # Return remote_addr directly (strip IPv6 brackets from socket address)
    return remote.split('%')[0]  # Remove zone ID

@app.route('/api/ip')
def client_ip_endpoint():
    ip = get_client_ip()
    return {"ip": ip, "version": 6 if ':' in ip else 4}
```

## X-Real-IP vs X-Forwarded-For

| Feature | X-Real-IP | X-Forwarded-For |
|---------|-----------|-----------------|
| Format | Single IP | Comma-separated list |
| Multi-proxy | Overwritten at each hop | Appended at each hop |
| IPv6 format | Plain address (no brackets) | Plain address (no brackets) |
| Spoofing risk | High if not validated | High if not validated |
| Standard | Non-standard (de facto) | RFC 7239 (`Forwarded`) |

## Verify X-Real-IP Headers

```bash
# Send from an IPv6 client and check what the backend sees
curl -6 -v https://app.example.com/api/ip 2>&1 | grep -E "X-Real-IP|ip"

# Check what Nginx is sending to the backend (enable debug logging)
# In nginx.conf: error_log /var/log/nginx/error.log debug;

# Expected application response:
# {"ip": "2001:db8::1", "version": 6}
```

## Conclusion

X-Real-IP provides a simple, single-value header for conveying the IPv6 client address through a reverse proxy. Unlike X-Forwarded-For, it contains exactly one IP and is overwritten at each proxy hop rather than accumulated. Configure Nginx with `proxy_set_header X-Real-IP $remote_addr`, HAProxy with `http-request set-header X-Real-IP %[src]`, and applications to validate the header only when the direct connection originates from a trusted proxy CIDR. Always use `ipaddress.ip_address()` to validate IPv6 addresses rather than string comparisons or regex.
