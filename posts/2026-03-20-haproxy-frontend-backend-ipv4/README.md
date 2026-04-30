# How to Set Up HAProxy Frontend and Backend with IPv4 Addresses

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: HAProxy, IPv4, Frontend, Backend, Load Balancing, Configuration

Description: Build a complete HAProxy configuration with frontend and backend sections to load balance HTTP traffic across multiple IPv4 backend servers.

## Introduction

HAProxy's configuration divides into `frontend` (accepts connections) and `backend` (defines servers) sections. This separation allows multiple frontends to share backends, provides clean traffic routing, and enables different policies per entry point.

## Complete Frontend/Backend Configuration

```haproxy
# /etc/haproxy/haproxy.cfg

global
    log /dev/log local0
    log /dev/log local1 notice
    chroot /var/lib/haproxy
    stats socket /run/haproxy/admin.sock mode 660 level admin
    stats timeout 30s
    user haproxy
    group haproxy
    daemon
    maxconn 50000

defaults
    log     global
    mode    http
    option  httplog
    option  dontlognull
    option  forwardfor        # Add X-Forwarded-For header
    option  http-server-close # Close server-side connections after each request
    timeout connect  5s
    timeout client   50s
    timeout server   50s
    errorfile 400 /etc/haproxy/errors/400.http
    errorfile 503 /etc/haproxy/errors/503.http

# ─── Frontend ───────────────────────────────────────────────────────────────

frontend http_frontend
    bind 203.0.113.10:80          # Listen on public IPv4
    bind 203.0.113.10:8080        # Also on alternate port

    # Route to specific backends based on URL path
    acl is_api  path_beg /api/
    acl is_app  path_beg /app/

    use_backend api_backend  if is_api
    use_backend app_backend  if is_app
    default_backend web_backend

# ─── Backends ────────────────────────────────────────────────────────────────
backend web_backend
    balance roundrobin

    # IPv4 backend servers with health checks
    server web1 192.168.1.10:8080 check inter 5s fall 3 rise 2
    server web2 192.168.1.11:8080 check inter 5s fall 3 rise 2
    server web3 192.168.1.12:8080 check inter 5s fall 3 rise 2 weight 2

backend api_backend
    balance leastconn          # Least connections for API

    option httpchk
    http-check send meth GET uri /api/health ver HTTP/1.1 hdr Host api.example.com

    server api1 192.168.2.10:8080 check
    server api2 192.168.2.11:8080 check
    server api3 192.168.2.12:8080 check backup   # Backup only

backend app_backend
    balance source             # Source IP persistence

    server app1 192.168.3.10:8080 check
    server app2 192.168.3.11:8080 check
```

## Health Check Configuration

```haproxy
backend web_backend
    # TCP connect health checks are enabled by the `check` keyword on each server.

    # To use an HTTP health check on a specific path instead:
    option httpchk GET /health
    http-check expect status 200

    server web1 192.168.1.10:8080 check port 8080 inter 3s fall 3 rise 2
    # inter 3s  = check every 3 seconds
    # fall 3    = mark down after 3 failed checks
    # rise 2    = mark up again after 2 successful checks
```

## Server Weights and Backup

```haproxy
backend app_backend
    balance roundrobin

    # Normal servers with different weights
    server app1 192.168.1.10:8080 check weight 3   # Gets 3x more traffic
    server app2 192.168.1.11:8080 check weight 1

    # Backup server (used only when all others are down)
    server app_backup 192.168.1.12:8080 check backup
```

## Stats Dashboard

```haproxy
frontend stats
    bind 10.0.0.1:8404    # Internal management IP only

    stats enable
    stats uri /stats
    stats refresh 10s
    stats admin if LOCALHOST    # Allow admin actions from localhost
    stats auth admin:securepass  # Basic auth for stats page
```

## Testing the Configuration

```bash
# Validate configuration
sudo haproxy -c -f /etc/haproxy/haproxy.cfg
# Expected: Configuration file is valid

# Reload the service
sudo systemctl reload haproxy

# Verify listening ports
sudo ss -tlnp | grep haproxy

# Check backend server states
echo "show servers state" | sudo socat stdio unix-connect:/run/haproxy/admin.sock

# View stats page
curl -u admin:securepass http://10.0.0.1:8404/stats
```

## Conclusion

HAProxy's frontend/backend architecture cleanly separates ingress configuration from server pool definitions. Use ACLs in frontends to route traffic to appropriate backends, configure health checks with sensible `inter`, `fall`, and `rise` values, and always validate with `haproxy -c` before applying changes. The stats socket enables zero-downtime management operations without configuration reloads.
