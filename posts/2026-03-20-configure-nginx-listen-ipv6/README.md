# How to Configure Nginx to Listen on IPv6 Addresses

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, Nginx, Web Server, Network Configuration, Listen Directive

Description: Learn how to configure Nginx to accept connections on IPv6 addresses, including listening on specific IPv6 addresses, all interfaces, and handling the ipv6only parameter.

## Basic IPv6 Listen Directive

```nginx
# nginx.conf or site configuration
# These are alternative listen patterns - pick the one(s) that match your needs.
# A single server block cannot bind both the IPv6 wildcard [::] and specific
# IPv6 addresses on the same port at the same time.

server {
    # Listen on IPv6 loopback
    listen [::1]:80;

    # Or listen on a specific IPv6 address
    # listen [2001:db8::10]:80;

    # Or listen on all IPv6 addresses (ipv6only=on is the default since nginx 1.3.4)
    # listen [::]:80;

    # Or listen on all IPv6 with ipv6only explicit (only IPv6, not IPv4)
    # listen [::]:80 ipv6only=on;

    server_name example.com;
    root /var/www/html;
}
```

## IPv6-Only Server Block

```nginx
server {
    # IPv6 only on port 80
    listen [::]:80 ipv6only=on;

    server_name example.com;

    location / {
        root /var/www/html;
        index index.html;
    }
}
```

## Dual-Stack: IPv4 and IPv6

```nginx
server {
    # IPv4
    listen 0.0.0.0:80;

    # IPv6 (separate listen directive)
    listen [::]:80 ipv6only=on;

    server_name example.com;

    location / {
        root /var/www/html;
    }
}
```

## HTTPS with IPv6

```nginx
server {
    # IPv4 HTTPS
    listen 443 ssl;

    # IPv6 HTTPS
    listen [::]:443 ssl ipv6only=on;

    server_name example.com;

    ssl_certificate /etc/ssl/certs/example.com.crt;
    ssl_certificate_key /etc/ssl/private/example.com.key;
    ssl_protocols TLSv1.2 TLSv1.3;

    location / {
        root /var/www/html;
    }
}
```

## Listen on Specific IPv6 Addresses

```nginx
server {
    # Only accept connections on specific IPv6 addresses
    listen [2001:db8::10]:80;
    listen [2001:db8::20]:80;

    # Note: don't use [::] if you only want specific addresses

    server_name example.com;
}
```

## Default Server with IPv6

```nginx
# Mark server block as default for this address/port

server {
    listen [::]:80 default_server ipv6only=on;
    listen 80 default_server;

    server_name _;

    location / {
        return 200 "Default server\n";
    }
}
```

## Verify IPv6 Listening

```bash
# Check nginx is listening on IPv6 ports
ss -6 -tlnp | grep nginx

# Or with netstat
netstat -tlnp | grep nginx | grep ':::'

# Test connection over IPv6
curl -6 http://[::1]/
curl -6 http://[2001:db8::10]/

# Check nginx configuration syntax
nginx -t
```

## Summary

Configure Nginx to listen on IPv6 with `listen [::]:80;` (all IPv6 addresses) or `listen [2001:db8::10]:80;` (specific address). Use `ipv6only=on` to prevent the `[::]` listener from also accepting IPv4 connections. For dual-stack, use separate `listen 0.0.0.0:80;` and `listen [::]:80 ipv6only=on;` directives. Verify with `ss -6 -tlnp | grep nginx` and test with `curl -6 http://[::1]/`.
