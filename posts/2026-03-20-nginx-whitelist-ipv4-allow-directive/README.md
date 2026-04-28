# How to Whitelist IPv4 Addresses in Nginx Using the Allow Directive

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Nginx, IPv4, Access Control, Security, Allow Directive, Firewall

Description: Use Nginx's allow and deny directives to whitelist specific IPv4 addresses and subnets, restricting access to sensitive endpoints or entire virtual hosts.

## Introduction

Nginx's `ngx_http_access_module` provides simple IP-based access control through `allow` and `deny` directives. Rules are evaluated top to bottom, so the order matters-place specific addresses before broader rules.

## Basic IPv4 Whitelist

Allow specific IPs and deny everyone else:

```nginx
# /etc/nginx/conf.d/admin.conf

server {
    listen 80;
    server_name admin.example.com;

    location / {
        # Allow specific trusted IPv4 addresses
        allow 203.0.113.10;       # Office workstation
        allow 198.51.100.25;      # Developer VPN exit node
        allow 10.0.0.0/8;         # Internal network
        allow 192.168.1.0/24;     # Management subnet

        # Deny all other IPv4 (and IPv6) traffic
        deny all;

        proxy_pass http://admin_backend;
    }
}
```

## Whitelisting at the Server Level

Apply the whitelist to an entire virtual host instead of individual locations:

```nginx
server {
    listen 80;
    server_name internal-api.example.com;

    # Server-level access control applies to all locations
    allow 10.0.0.0/8;
    allow 172.16.0.0/12;
    allow 192.168.0.0/16;
    deny all;

    location /api/v1/ {
        proxy_pass http://api_backend;
    }

    location /metrics {
        proxy_pass http://metrics_backend;
    }
}
```

## Mixing Allow and Deny for Selective Access

Allow a broad range but deny specific subnets within it:

```nginx
server {
    listen 80;
    server_name monitoring.example.com;

    location /grafana {
        # Deny the untrusted 10.10.x.x range first
        deny  10.10.0.0/16;

        # Allow the rest of the internal network
        allow 10.0.0.0/8;

        # Deny all external traffic
        deny all;

        proxy_pass http://grafana;
    }
}
```

## Returning a Custom Error for Denied Requests

By default, Nginx returns 403 Forbidden. Customize the response:

```nginx
server {
    listen 80;

    # Custom 403 page
    error_page 403 /403.html;
    location = /403.html {
        root /var/www/html;
        internal;
    }

    location /restricted {
        allow 192.168.1.0/24;
        deny all;

        proxy_pass http://restricted_backend;
    }
}
```

## Protecting Nginx Status Endpoints

A common use case: restrict `stub_status` to localhost only:

```nginx
server {
    listen 80;

    location /nginx_status {
        stub_status;
        allow 127.0.0.1;    # Localhost only
        allow 10.0.0.5;     # Monitoring server
        deny all;
    }
}
```

## Including a Whitelist from an External File

For large lists, maintain allowed IPs in a separate file:

```nginx
# /etc/nginx/whitelist-ips.conf

allow 203.0.113.0/24;
allow 198.51.100.10;
allow 198.51.100.11;
allow 10.0.0.0/8;
deny all;
```

```nginx
server {
    listen 80;

    location /api {
        include /etc/nginx/whitelist-ips.conf;
        proxy_pass http://api_backend;
    }
}
```

Reload Nginx after updating the file:

```bash
sudo nginx -t && sudo nginx -s reload
```

## Conclusion

Nginx's `allow` and `deny` directives provide a fast, request-level access control layer for IPv4 addresses. Always place specific rules before broad ones, end every whitelist with `deny all`, and reload Nginx to apply changes. For dynamic whitelists that update frequently without reloads, consider combining with the `geo` module or an external WAF.
