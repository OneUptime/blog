# How to Configure Nginx Access Control for IPv6 Subnets

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, Nginx, Access Control, Allow/deny, Security

Description: Learn how to configure Nginx allow/deny rules for IPv6 addresses and subnets to restrict access to web resources based on client IPv6 addresses.

## Basic IPv6 Allow/Deny

```nginx
server {
    listen [::]:80 ipv6only=on;
    listen 80;

    server_name example.com;

    location /admin {
        # Allow specific IPv6 address
        allow 2001:db8::10;

        # Allow an IPv6 subnet
        allow 2001:db8:abcd::/48;

        # Allow IPv4 addresses too
        allow 192.168.1.0/24;

        # Deny everything else
        deny all;

        proxy_pass http://[::1]:8080;
    }
}
```

## Allow List Configuration

```nginx
# Only allow specific IPv6 ranges

server {
    listen [::]:443 ssl ipv6only=on;
    listen 443 ssl;

    server_name internal.example.com;

    ssl_certificate     /etc/ssl/certs/internal.crt;
    ssl_certificate_key /etc/ssl/private/internal.key;

    # Corporate IPv6 ranges only
    allow 2001:db8:cafe::/48;
    allow 2001:db8:beef::/48;
    allow fd12:3456::/32;           # ULA range

    # IPv4 VPN clients
    allow 10.0.0.0/8;

    # Deny all others
    deny all;

    location / {
        root /var/www/internal;
    }
}
```

## Block Specific IPv6 Addresses

```nginx
server {
    listen [::]:80 ipv6only=on;
    listen 80;

    server_name example.com;

    # Block known bad actors
    deny 2001:db8::bad:ac70;
    deny 2001:db8:dead::/48;

    # Allow everyone else
    allow all;

    location / {
        root /var/www/html;
    }
}
```

## Per-Location Access Control

```nginx
server {
    listen [::]:80 ipv6only=on;
    listen 80;

    server_name example.com;

    # Public area - no restrictions
    location / {
        root /var/www/public;
    }

    # Admin area - restricted to IPv6 management subnet
    location /admin/ {
        allow 2001:db8:1234::/64;
        allow ::1;  # localhost
        deny all;

        root /var/www/admin;
    }

    # API area - restrict to internal subnets
    location /api/ {
        allow 2001:db8:f00d::/48;
        allow 192.168.0.0/16;
        deny all;

        proxy_pass http://[2001:db8::1]:3000;
    }
}
```

## Using geo Module for IPv6

```nginx
# Classify IPv6 clients with geo module
geo $allowed_client {
    default          0;

    # Allow corporate IPv6
    2001:db8::/32    1;
    fd00::/8         1;   # ULA ranges

    # Allow IPv4 ranges
    192.168.0.0/16   1;
    10.0.0.0/8       1;
}

server {
    listen [::]:80 ipv6only=on;
    listen 80;

    server_name api.example.com;

    location /api/ {
        if ($allowed_client = 0) {
            return 403;
        }
        proxy_pass http://[2001:db8::1]:3000;
    }
}
```

## Testing Access Control

```bash
# Test from an allowed IPv6 address
curl -6 --interface 2001:db8::10 http://example.com/admin/

# Test from a blocked address (should get 403)
curl -6 --interface 2001:db8::bad:ac70 http://example.com/admin/

# Test from IPv4 (when dual-stack)
curl -4 http://example.com/admin/

# View access log to confirm
tail -f /var/log/nginx/access.log | grep -v '200'
```

## Summary

Configure IPv6 access control in Nginx with `allow 2001:db8:abcd::/48;` and `deny all;` directives. Rules are evaluated in order - first match wins. Allow specific addresses/subnets before a final `deny all`. For more complex rules, use the `geo` module to classify clients and check with `if` conditionals. IPv6 prefixes work directly in allow/deny without brackets. Test with `curl -6 --interface <ipv6-addr>`.
