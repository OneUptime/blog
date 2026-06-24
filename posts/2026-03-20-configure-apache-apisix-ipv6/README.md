# How to Configure Apache APISIX for IPv6

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: APISIX, API Gateway, IPv6, Networking, Lua, Nginx

Description: Enable IPv6 support in Apache APISIX by configuring NGINX listeners, Admin API bindings, and upstream service definitions for dual-stack operation.

## Introduction

Apache APISIX is built on top of NGINX and OpenResty, so enabling IPv6 involves configuring NGINX listener directives via APISIX's `config.yaml`. APISIX can proxy both IPv4 and IPv6 traffic simultaneously with minor configuration changes, and its Admin API can also be bound to an IPv6 address.

## Prerequisites

- Apache APISIX 3.x installed
- etcd cluster for configuration storage
- An IPv6-enabled host

## Step 1: Update config.yaml for IPv6 Listeners

APISIX's main configuration file controls NGINX listener bindings.

```yaml
# /usr/local/apisix/conf/config.yaml

apisix:
  enable_ipv6: true
  node_listen:
    - port: 9080
  ssl:
    enable: true
    listen:
      - port: 9443

deployment:
  admin:
    allow_admin:
      - 127.0.0.0/24
      - "::1/128"
    admin_listen:
      ip: "[::1]"
      port: 9180
  etcd:
    host:
      - "http://[::1]:2379"
    prefix: /apisix
```

With `enable_ipv6: true`, leaving `ip` unset on `node_listen` and `ssl.listen` makes APISIX generate both IPv4 (`0.0.0.0`) and IPv6 (`[::]`) listeners for those ports. The Admin API uses a single `admin_listen` entry, so this example binds it on IPv6 loopback and explicitly allows `::1`.

## Step 2: Define an Upstream with IPv6 Nodes

Use the Admin API to create an upstream that includes IPv6 backend addresses.

```bash
# Create an upstream with IPv6 backend nodes

curl -X PUT http://[::1]:9180/apisix/admin/upstreams/1 \
  -H "X-API-KEY: your-admin-key" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "roundrobin",
    "nodes": {
      "[2001:db8::10]:8080": 1,
      "[2001:db8::11]:8080": 1
    },
    "checks": {
      "active": {
        "http_path": "/health",
        "healthy": {
          "interval": 2,
          "successes": 1
        },
        "unhealthy": {
          "interval": 1,
          "http_failures": 2
        }
      }
    }
  }'
```

## Step 3: Create a Route

```bash
# Create a route that uses the IPv6 upstream
curl -X PUT http://[::1]:9180/apisix/admin/routes/1 \
  -H "X-API-KEY: your-admin-key" \
  -H "Content-Type: application/json" \
  -d '{
    "uri": "/api/*",
    "name": "ipv6-api-route",
    "upstream_id": 1,
    "plugins": {
      "proxy-rewrite": {
        "regex_uri": ["/api/(.*)", "/$1"]
      }
    }
  }'
```

## Step 4: Verify Listeners and Test

```bash
# Check APISIX is bound to IPv6
ss -tlnp | grep -E "9080|9443|9180"

# Test the proxy over IPv6
curl -6 http://[::1]:9080/api/health

# Test via hostname resolving to IPv6
curl -6 http://mygateway.example.com/api/health

# Check Admin API over IPv6
curl -6 http://[::1]:9180/apisix/admin/routes \
  -H "X-API-KEY: your-admin-key"
```

## Step 5: Enable the IP Restriction Plugin for IPv6 Subnets

```bash
# Add IP restriction to a route for IPv6 CIDR blocks
curl -X PATCH http://[::1]:9180/apisix/admin/routes/1 \
  -H "X-API-KEY: your-admin-key" \
  -H "Content-Type: application/json" \
  -d '{
    "plugins": {
      "ip-restriction": {
        "whitelist": [
          "2001:db8::/32",
          "192.168.0.0/24"
        ]
      }
    }
  }'
```

## Common Issues

- **NGINX not binding to IPv6**: Verify `apisix.enable_ipv6: true` is set. If you specify literal IPv6 listener addresses, use bracketed form such as `"[::]"`.
- **Admin API over `::1` returns `403`**: Add `::1` or the appropriate IPv6 subnet to `deployment.admin.allow_admin`.
- **etcd connection refused**: Ensure etcd is listening on `::1` if using loopback, and configure it under `deployment.etcd.host`.
- **Upstream health checks failing**: Health check connections inherit the upstream address family and configured `http_path` - no separate IPv6 flag is required.

## Conclusion

In APISIX 3.x, dual-stack gateway listeners come from `enable_ipv6: true` plus listener entries that do not pin the gateway to IPv4-only addresses. IPv6 upstreams and Admin API bindings should use bracketed literals when a host and port are combined. Use OneUptime's HTTP monitors to probe both IPv4 and IPv6 paths of your APISIX gateway continuously.
