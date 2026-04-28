# How to Configure Nginx to Listen Only on IPv4

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Nginx, IPv4, IPv6, Network Configuration, Web Server

Description: Learn how to configure Nginx to listen exclusively on IPv4 addresses, disabling IPv6 listeners to simplify network configuration or meet specific deployment requirements.

## Introduction

By default, Nginx may listen on both IPv4 and IPv6 addresses. In some environments - such as networks that don't support IPv6, legacy applications, or specific compliance requirements - you may need Nginx to listen only on IPv4. This guide explains how to configure this correctly.

## Default Nginx Listen Behavior

Nginx's `listen` directives behave as follows:

- `listen 80;` (equivalent to `listen *:80;`) binds to all IPv4 interfaces on port 80.
- `listen [::]:80;` binds to all IPv6 interfaces on port 80. Since Nginx 0.7.42, the `ipv6only` parameter defaults to `on`, so the IPv6 socket accepts only IPv6 connections.
- To accept both IPv4 and IPv6 connections on a single socket, you would need `listen [::]:80 ipv6only=off;` (and the kernel's `net.ipv6.bindv6only` set to 0).

In practice, this means IPv4 and IPv6 are typically configured with separate `listen` directives, and a configuration that has only `listen 80;` (without `listen [::]:80;`) is already IPv4-only.

## Method 1: Explicitly Specify IPv4 in listen

Use an explicit IPv4 address or `0.0.0.0`:

```nginx
server {
    listen 0.0.0.0:80;   # IPv4 on all interfaces, port 80
    server_name example.com;

    root /var/www/html;
    index index.html;

    location / {
        try_files $uri $uri/ =404;
    }
}

server {
    listen 0.0.0.0:443 ssl;
    server_name example.com;

    ssl_certificate     /etc/nginx/ssl/example.com.crt;
    ssl_certificate_key /etc/nginx/ssl/example.com.key;

    root /var/www/html;

    location / {
        try_files $uri $uri/ =404;
    }
}
```

## Method 2: Omit IPv6 listen Directives

Simply do not include `listen [::]:80`:

```nginx
# nginx.conf or conf.d/default.conf

server {
    listen 80;        # IPv4 only (binds to 0.0.0.0:80)
    # Do NOT add: listen [::]:80;
    server_name example.com;
    ...
}
```

## Method 3: Disable IPv6 at the System Level

Check if IPv6 is enabled:

```bash
sysctl net.ipv6.conf.all.disable_ipv6
```

Disable IPv6 system-wide (use with caution):

```bash
# Temporary
sysctl -w net.ipv6.conf.all.disable_ipv6=1
sysctl -w net.ipv6.conf.default.disable_ipv6=1

# Permanent - add to /etc/sysctl.d/99-disable-ipv6.conf
net.ipv6.conf.all.disable_ipv6 = 1
net.ipv6.conf.default.disable_ipv6 = 1
net.ipv6.conf.lo.disable_ipv6 = 1
```

Apply:

```bash
sysctl --system
```

After disabling IPv6 system-wide, Nginx's `listen 80` will only bind to IPv4.

## Verifying the Configuration

Test the Nginx configuration:

```bash
nginx -t
```

Reload Nginx:

```bash
systemctl reload nginx
```

Verify listening addresses:

```bash
ss -tlnp | grep nginx
```

Expected output (IPv4 only):

```text
LISTEN  0  511  0.0.0.0:80   0.0.0.0:*  users:(("nginx",...))
LISTEN  0  511  0.0.0.0:443  0.0.0.0:*  users:(("nginx",...))
```

You should NOT see any `[::]:80` entries.

## Complete IPv4-Only Configuration Example

```nginx
# /etc/nginx/nginx.conf

user nginx;
worker_processes auto;
error_log /var/log/nginx/error.log warn;
pid /var/run/nginx.pid;

events {
    worker_connections 1024;
    use epoll;
}

http {
    include      /etc/nginx/mime.types;
    default_type application/octet-stream;

    sendfile    on;
    tcp_nopush  on;
    tcp_nodelay on;

    keepalive_timeout 65;

    server {
        listen 0.0.0.0:80 default_server;
        server_name _;
        return 301 https://$host$request_uri;
    }

    server {
        listen 0.0.0.0:443 ssl default_server;
        server_name example.com;

        ssl_certificate     /etc/nginx/ssl/cert.pem;
        ssl_certificate_key /etc/nginx/ssl/key.pem;
        ssl_protocols       TLSv1.2 TLSv1.3;

        root /var/www/html;

        location / {
            try_files $uri $uri/ =404;
        }
    }
}
```

## Best Practices

- Prefer `listen 0.0.0.0:80` over `listen 80` for clarity about which address family is used.
- Avoid disabling IPv6 system-wide unless absolutely required; prefer application-level configuration.
- Document the reason for IPv4-only configuration in configuration file comments.
- Test from an IPv6-capable client after changes to confirm IPv6 is blocked.
- Consider future IPv6 requirements before making IPv4-only a permanent decision.

## Conclusion

Configuring Nginx to listen only on IPv4 is straightforward using explicit `listen 0.0.0.0:port` directives and omitting `listen [::]:port`. This gives you precise control over the network protocols your Nginx instance uses without requiring system-wide IPv6 changes.
