# How to Configure Caddy as an IPv6 Reverse Proxy

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, Caddy, Reverse Proxy, Automatic HTTPS, Dual-Stack

Description: Configure Caddy as an IPv6-capable reverse proxy with automatic HTTPS, dual-stack listeners, and proper IPv6 client IP handling in the Caddyfile and JSON config.

## Introduction

Caddy is a modern web server and reverse proxy that automatically obtains and renews TLS certificates. It listens on both IPv4 and IPv6 by default when the host has both address families configured. This guide covers dual-stack Caddyfile configuration, IPv6 backend proxying, and client IP handling.

## Basic Dual-Stack Caddyfile

```caddyfile
# /etc/caddy/Caddyfile

# Caddy automatically listens on both IPv4 and IPv6

app.example.com {
    # Automatic HTTPS
    reverse_proxy backend:8080
}
```

By default, Caddy binds to all interfaces. No special IPv6 configuration is needed for dual-stack operation.

## Explicit IPv6 Binding

```caddyfile
# Bind only to a specific IPv6 address
{
    # Bind Caddyfile-generated servers to a specific IPv6 interface
    default_bind [2001:db8::1]
}

app.example.com {
    bind [2001:db8::1]
    reverse_proxy backend:8080
}

# If you want Automatic HTTPS redirects/challenges to use the same bind address,
# declare the HTTP site explicitly so default_bind applies to it too.
http://app.example.com {
}

# Or bind to all IPv6 only
:443 {
    bind [::]
    tls /etc/ssl/certs/cert.pem /etc/ssl/private/key.pem
    reverse_proxy backend:8080
}
```

## IPv6 Backend Proxying

```caddyfile
# Proxy to IPv6 backend - must use brackets
api.example.com {
    reverse_proxy {
        to [2001:db8::10]:8080
        to [2001:db8::11]:8080

        # Load balancing
        lb_policy round_robin

        # Health checks
        health_uri    /health
        health_interval 30s
    }
}
```

## Multiple Backends (IPv4 + IPv6)

```caddyfile
# Mixed IPv4 and IPv6 upstream pool
backend.example.com {
    reverse_proxy {
        to 10.0.0.1:8080
        to 10.0.0.2:8080
        to [2001:db8::10]:8080
        to [2001:db8::11]:8080
    }
}
```

## Trusted Proxies for Real Client IP

```caddyfile
{
    # Global trusted proxy CIDRs
    servers {
        trusted_proxies static 10.0.0.0/8 fd00::/8 2001:db8:100::/48
    }
}

app.example.com {
    # After trusted_proxies is set, {client_ip} contains the real client IP
    reverse_proxy backend:8080 {
        header_up X-Real-IP {client_ip}
    }

    # Log with real IPv6 client address
    log {
        output file /var/log/caddy/access.log
        format json
    }
}
```

## IPv6 Rate Limiting

```caddyfile
# Rate limiting with Caddy (requires caddy-ratelimit plugin)
app.example.com {
    rate_limit {
        zone per_ip {
            key {remote_host}
            events 100
            window 1m
        }
    }
    reverse_proxy backend:8080
}
```

## JSON API Configuration

For dynamic configuration via Caddy's API:

```json
{
  "apps": {
    "http": {
      "servers": {
        "main": {
          "listen": [":443"],
          "routes": [{
            "match": [{"host": ["app.example.com"]}],
            "handle": [{
              "handler": "reverse_proxy",
              "upstreams": [
                {"dial": "[2001:db8::10]:8080"},
                {"dial": "[2001:db8::11]:8080"}
              ]
            }]
          }]
        }
      }
    }
  }
}
```

```bash
# Apply JSON config via Caddy API
curl -X POST "http://[::1]:2019/load" \
    -H "Content-Type: application/json" \
    -d @caddy-config.json
```

## Verify IPv6 Listening

```bash
# Check Caddy listens on IPv6
ss -tlnp | grep caddy
# Should show an IPv6 listener such as [::]:443 or equivalent

# Test IPv6 connectivity
curl -6 https://app.example.com/health

# Check access logs for IPv6 addresses
tail -f /var/log/caddy/access.log | grep -E '"(remote_ip|client_ip)":"[0-9a-fA-F:]+"'
```

## Conclusion

Caddy handles IPv6 automatically - sites bind on all interfaces by default, and `{remote_host}` captures the direct peer address correctly without special configuration. For IPv6 backend proxying, use bracket notation for addresses in `to` directives. Configure `trusted_proxies` in the global block to enable correct client IP extraction from `X-Forwarded-For`, then use `{client_ip}` if your upstream needs the parsed real client IP. Caddy is an easy reverse proxy to make dual-stack since it requires no IPv6-specific configuration for basic operation.
