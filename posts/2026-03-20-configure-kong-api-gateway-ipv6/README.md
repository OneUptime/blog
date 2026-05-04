# How to Configure Kong API Gateway for IPv6

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kong, API Gateway, IPv6, Networking, Docker, Configuration

Description: Configure Kong API Gateway to accept and proxy IPv6 traffic by adjusting listener addresses, environment variables, and upstream service definitions.

## Introduction

Kong API Gateway sits in front of your services and handles routing, authentication, and rate limiting. Enabling IPv6 requires configuring Kong's listeners and ensuring its underlying NGINX engine binds to IPv6 interfaces.

## Prerequisites

- Kong Gateway 3.x installed (Docker or bare-metal)
- PostgreSQL or DB-less mode
- An IPv6-enabled network interface

## Step 1: Configure IPv6 Listeners via Environment Variables

When running Kong via Docker or environment variables, set the proxy and admin listeners to dual-stack addresses.

```bash
# Docker run example with dual-stack listeners.
# KONG_PROXY_LISTEN holds both the plain HTTP and the `ssl` entries on IPv4 and IPv6.
# KONG_ADMIN_LISTEN handles the Admin API on both stacks.
docker run -d --name kong \
  -e KONG_DATABASE=off \
  -e KONG_DECLARATIVE_CONFIG=/kong/kong.yml \
  -e KONG_PROXY_LISTEN="0.0.0.0:8000, [::]:8000, 0.0.0.0:8443 ssl, [::]:8443 ssl" \
  -e KONG_ADMIN_LISTEN="0.0.0.0:8001, [::]:8001" \
  -p 8000:8000 \
  -p 8001:8001 \
  -p 8443:8443 \
  kong:3.6
```

## Step 2: Configure kong.conf for Bare-Metal Installs

Edit `/etc/kong/kong.conf` to add IPv6 to all listener directives.

```ini
# /etc/kong/kong.conf

# Proxy listens on IPv4 and IPv6, with SSL entries appended via the `ssl` suffix
proxy_listen = 0.0.0.0:8000 reuseport backlog=16384, [::]:8000 reuseport backlog=16384, 0.0.0.0:8443 ssl, [::]:8443 ssl

# Admin API on both stacks (restrict in production)
admin_listen = 127.0.0.1:8001, [::1]:8001

# Stream proxy (if using TCP routes)
stream_listen = 0.0.0.0:5555, [::]:5555
```

Reload Kong after changes:

```bash
kong reload
```

## Step 3: Define an IPv6 Upstream Service (DB-less)

Create a declarative config that points to an IPv6 upstream.

```yaml
# kong.yml - DB-less declarative configuration
_format_version: "3.0"

services:
  - name: my-ipv6-service
    # Use bracket notation for IPv6 upstream addresses
    host: "2001:db8::10"
    port: 8080
    protocol: http
    connect_timeout: 5000
    routes:
      - name: my-route
        paths:
          - /api/v1

upstreams:
  - name: ipv6-backend-pool
    targets:
      # IPv6 targets in bracket notation with port
      - target: "[2001:db8::10]:8080"
        weight: 100
      - target: "[2001:db8::11]:8080"
        weight: 100
```

## Step 4: Verify Kong is Listening on IPv6

```bash
# Check open ports - look for ::: entries (IPv6)
ss -tlnp | grep kong

# Or with netstat
netstat -tlnp | grep 8000

# Test the admin API over IPv6
curl -6 http://[::1]:8001/

# Test the proxy over IPv6
curl -6 -H "Host: myservice.example.com" \
  http://[::1]:8000/api/v1/health
```

## Step 5: Add a Rate-Limiting Plugin with IPv6 Awareness

Kong's rate-limiting plugin can key on IPv6 client addresses automatically.

```bash
# Apply rate limiting globally, keyed by client IP (supports both IPv4 and IPv6).
curl -X POST http://[::1]:8001/plugins \
  -H "Content-Type: application/json" \
  -d '{
    "name": "rate-limiting",
    "config": {
      "minute": 100,
      "hour": 5000,
      "policy": "local",
      "limit_by": "ip"
    }
  }'
```

## Conclusion

Kong handles IPv6 through its NGINX layer, so the key changes are in the listener configuration. Adding `[::]:<port>` listeners alongside the existing `0.0.0.0:<port>` entries enables dual-stack operation with minimal risk. Use OneUptime to monitor your Kong Gateway endpoints over both IPv4 and IPv6 to catch any protocol-specific outages.
