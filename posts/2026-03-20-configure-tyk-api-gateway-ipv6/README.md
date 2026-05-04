# How to Configure Tyk API Gateway for IPv6

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Tyk, API Gateway, IPv6, Networking, Go, Configuration

Description: Enable IPv6 support in Tyk API Gateway by configuring listener addresses, upstream targets, and health check endpoints for dual-stack operation.

## Introduction

Tyk is a Go-based API Gateway that inherits Go's native IPv6 support. Enabling IPv6 involves updating `tyk.conf` listener bindings and ensuring upstream service definitions use proper IPv6 address notation.

## Prerequisites

- Tyk Gateway 5.x installed
- Redis for session storage
- An IPv6-enabled network interface

## Step 1: Configure the Listener Address

Edit `tyk.conf` and update the `listen_address` and `listen_port` fields.

```json
{
  "listen_address": "::",
  "listen_port": 8080,
  "secret": "your-api-secret",
  "node_secret": "your-node-secret",
  "template_path": "/opt/tyk-gateway/templates",
  "tyk_js_path": "/opt/tyk-gateway/js/tyk.js",
  "middleware_path": "/opt/tyk-gateway/middleware",
  "use_db_app_configs": false,
  "app_path": "/opt/tyk-gateway/apps/",
  "storage": {
    "type": "redis",
    "host": "::1",
    "port": 6379
  },
  "enable_api_segregation": false,
  "control_api_hostname": "::1",
  "control_api_port": 9696
}
```

Setting `listen_address` to `"::"` binds to all IPv6 interfaces. On a dual-stack host, Go's net package handles both IPv4 and IPv6 requests on this socket.

## Step 2: Define an IPv6 API Target

Create an API definition JSON file that points to an IPv6 upstream.

```json
{
  "name": "IPv6 Backend Service",
  "api_id": "ipv6-backend",
  "org_id": "default",
  "use_keyless": true,
  "definition": {
    "location": "header",
    "key": "x-api-version"
  },
  "auth": {
    "auth_header_name": "Authorization"
  },
  "version_data": {
    "not_versioned": true,
    "versions": {
      "Default": {
        "name": "Default"
      }
    }
  },
  "proxy": {
    "listen_path": "/ipv6-api/",
    "target_url": "http://[2001:db8::10]:8080/",
    "strip_listen_path": true
  },
  "active": true
}
```

Note: IPv6 addresses in URLs must be wrapped in square brackets as per RFC 2732.

## Step 3: Restart and Verify

```bash
# Restart Tyk Gateway

sudo systemctl restart tyk-gateway

# Check that Tyk is listening on IPv6
ss -tlnp | grep 8080

# Test the gateway over IPv6 using the control API
curl -6 http://[::1]:9696/tyk/apis \
  -H "X-Tyk-Authorization: your-api-secret"

# Test a proxied request over IPv6
curl -6 http://[::1]:8080/ipv6-api/health
```

## Step 4: Configure Health Checks over IPv6

Tyk's `/hello` liveness endpoint is exposed on the gateway listener and does not require authentication. Set up external monitoring to probe it over IPv6.

```bash
# Health check endpoint (returns gateway and component status)
curl -6 http://[::1]:8080/hello

# Example response
# {"status":"pass","version":"5.3.0","description":"Tyk GW","details":{"redis":{"status":"pass","componentType":"datastore","time":"..."}}}
```

## Step 5: Update Redis for IPv6

If Redis is on the same host, configure it to listen on IPv6 and update Tyk's storage config.

```conf
# /etc/redis/redis.conf
# Bind to loopback on both stacks
bind 127.0.0.1 ::1
```

```bash
sudo systemctl restart redis
# Verify Redis IPv6 listener
redis-cli -6 -h ::1 ping
```

## Conclusion

Tyk's Go runtime makes IPv6 configuration straightforward - the primary change is the `listen_address` binding and ensuring upstream `target_url` values use bracket notation for IPv6 addresses. Monitor your Tyk gateway using OneUptime to ensure both IPv4 and IPv6 paths remain healthy.
