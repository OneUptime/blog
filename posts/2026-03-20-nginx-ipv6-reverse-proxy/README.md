# How to Configure Nginx as an IPv6 Reverse Proxy

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, Nginx, Reverse Proxy, Web Server, Dual-Stack

Description: Configure Nginx to listen on IPv6 interfaces as a reverse proxy, handling dual-stack connections, logging IPv6 client addresses, and proxying to IPv4 or IPv6 backends.

## Introduction

Nginx supports IPv6 through the `listen [::]:port` directive. When configured as a reverse proxy, it accepts connections from IPv4 and IPv6 clients and forwards them to backends over IPv4 or IPv6. Key configuration areas include listen directives, client IP logging, and proper `X-Forwarded-For` header handling.

## Basic IPv6 Reverse Proxy Configuration

```nginx
# /etc/nginx/sites-available/app.conf

upstream backend {
    # Backend servers - can be IPv4 or IPv6
    server 10.0.0.1:8080;
    server 10.0.0.2:8080;
    # IPv6 backends must use brackets
    server [2001:db8::10]:8080;
    server [2001:db8::11]:8080;
}

server {
    # Listen on both IPv4 and IPv6
    listen      80;
    listen      [::]:80;

    # IPv6 HTTPS
    listen      443 ssl;
    listen      [::]:443 ssl;

    server_name app.example.com;
    ssl_certificate     /etc/ssl/certs/app.pem;
    ssl_certificate_key /etc/ssl/private/app.key;

    # Proxy to backend
    location / {
        proxy_pass http://backend;

        # Pass client address - works for both IPv4 and IPv6
        proxy_set_header X-Forwarded-For   $proxy_add_x_forwarded_for;
        proxy_set_header X-Real-IP         $remote_addr;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Host              $host;
    }
}
```

## Real IP Configuration

When Nginx is behind another proxy, configure `real_ip` to extract the actual client IPv6 address:

```nginx
# /etc/nginx/conf.d/real_ip.conf

# Trusted proxy sources (IPv4 and IPv6)

set_real_ip_from 10.0.0.0/8;
set_real_ip_from 172.16.0.0/12;
set_real_ip_from fc00::/7;          # ULA internal proxies (RFC 4193)
set_real_ip_from 2001:db8::/32;     # Internal IPv6 range

# Use X-Forwarded-For to get real client IP
real_ip_header X-Forwarded-For;
real_ip_recursive on;
```

## IPv6 Access Logging

```nginx
# /etc/nginx/nginx.conf

# Custom log format that handles long IPv6 addresses
log_format combined_ipv6 '$remote_addr - $remote_user [$time_local] '
                          '"$request" $status $body_bytes_sent '
                          '"$http_referer" "$http_user_agent" '
                          'rt=$request_time';

access_log /var/log/nginx/access.log combined_ipv6;
```

## IPv6 Rate Limiting

```nginx
# Rate limiting that handles IPv6 /64 prefix
# Group IPv6 by /64 (handles privacy extensions)
geo $limit_key {
    default $binary_remote_addr;
    # For IPv6: you can use the first 64 bits as the key
    # This requires the ngx_http_geo_module
}

limit_req_zone $binary_remote_addr zone=api_limit:10m rate=10r/s;

server {
    location /api/ {
        limit_req zone=api_limit burst=20 nodelay;
        proxy_pass http://backend;
    }
}
```

## IPv6 GeoIP Restrictions

```nginx
# Restrict access by IPv6 GeoIP country
geoip2 /etc/geoip/GeoLite2-Country.mmdb {
    $geoip2_country_code country iso_code;
}

server {
    location /admin {
        if ($geoip2_country_code !~ ^(US|CA|GB)$) {
            return 403;
        }
        proxy_pass http://backend;
    }
}
```

## Health Check for IPv6 Backend

```nginx
upstream backend_v6 {
    # Passive health checks (built-in): mark a backend as unavailable
    # after max_fails errors within fail_timeout (default: 1 / 10s).
    server [2001:db8::10]:8080 max_fails=3 fail_timeout=30s;
    server [2001:db8::11]:8080 max_fails=3 fail_timeout=30s;
}

server {
    location / {
        proxy_pass http://backend_v6;
        proxy_next_upstream error timeout http_502 http_503;
        proxy_connect_timeout 3s;
    }
}
```

## Dual-Stack Configuration with IPv6 Preferred

```nginx
# Prefer IPv6 connections to backend (if backend has both A and AAAA)
# Nginx uses DNS resolution; to prefer IPv6, ensure AAAA comes first
# in /etc/hosts or configure the resolver:

resolver [2001:db8::53] ipv6=on;
resolver_timeout 5s;

upstream smart_backend {
    # Use hostname - Nginx will use AAAA if available
    server backend.internal:8080;
}
```

## Conclusion

Nginx dual-stack reverse proxy configuration requires `listen [::]:port` alongside `listen port` for IPv6 acceptance, and bracket notation (`[IPv6addr]:port`) for IPv6 backend addresses in upstream blocks. Enable `real_ip_header` processing to correctly identify client IPv6 addresses when Nginx is behind another proxy. The `$remote_addr` variable in Nginx contains the full IPv6 address when clients connect over IPv6, so log formats and rate limiting keys automatically handle IPv6 without special treatment.
