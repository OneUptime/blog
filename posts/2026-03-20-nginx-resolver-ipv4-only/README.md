# How to Configure the Nginx Resolver to Use IPv4 Only (ipv6=off)

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Linux, Nginx, IPv4, DNS Resolver, Networking, Configuration

Description: Configure the Nginx resolver directive to use IPv4-only DNS resolution by specifying DNS server addresses and disabling IPv6 lookups with ipv6=off.

## Introduction

Nginx uses the `resolver` directive to resolve hostnames in proxy_pass, upstream server names, and `set $variable` with domain names. The `ipv6=off` parameter prevents Nginx from querying AAAA records, ensuring all resolved hostnames use IPv4 only.

## Basic Resolver Configuration

```nginx
http {
    # Use 8.8.8.8 as the DNS resolver, IPv4 results only
    resolver 8.8.8.8 ipv6=off;

    server {
        listen 80;
        server_name example.com;

        location / {
            # Nginx resolves "backend.internal" using the resolver above
            proxy_pass http://backend.internal:8080;
        }
    }
}
```

## Resolver with Multiple DNS Servers

```nginx
http {
    # Query 8.8.8.8 and 1.1.1.1 in round-robin fashion
    resolver 8.8.8.8 1.1.1.1 ipv6=off;

    # ...
}
```

## Resolver with Custom TTL

```nginx
http {
    # Cache DNS results for 30 seconds
    resolver 8.8.8.8 ipv6=off valid=30s;
}
```

## Resolver in location Block (Dynamic Proxy)

```nginx
http {
    resolver 8.8.8.8 ipv6=off;

    server {
        listen 80;

        location / {
            # Variable forces runtime DNS resolution
            set $backend "api.example.com";
            proxy_pass http://$backend:8080;
        }
    }
}
```

Note: When `proxy_pass` uses a variable, Nginx resolves the hostname at request time using the resolver. Without a variable, it resolves at startup.

## Resolver in stream Block (TCP Proxy)

```nginx
stream {
    resolver 8.8.8.8 ipv6=off valid=60s;

    server {
        listen 3306;
        proxy_pass db.internal:3306;
    }
}
```

## Use Local DNS Server

```nginx
http {
    # Use the system's local DNS resolver
    resolver 127.0.0.1 ipv6=off valid=30s;
}
```

## Verify Resolver is Working

```bash
# Check Nginx config syntax

nginx -t

# Reload
systemctl reload nginx

# Test that the backend resolves to IPv4
nslookup backend.internal 8.8.8.8

# Check Nginx error log for resolution issues
tail -f /var/log/nginx/error.log
```

## Why ipv6=off Matters

Without `ipv6=off`, Nginx may receive both A (IPv4) and AAAA (IPv6) records. If IPv6 is not reachable, connections to AAAA addresses fail, causing timeouts. Setting `ipv6=off` prevents AAAA lookups entirely.

## Conclusion

The Nginx `resolver` directive with `ipv6=off` forces IPv4-only DNS resolution. Specify one or more DNS server IPs, set `valid` for DNS cache TTL, and use `ipv6=off` to prevent AAAA record lookups. The resolver is required when `proxy_pass` uses variables or when hostname resolution is needed at request time.
