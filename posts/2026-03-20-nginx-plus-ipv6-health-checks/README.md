# How to Configure NGINX Plus with IPv6 Active Health Checks

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, NGINX Plus, Load Balancer, Health Check, Enterprise

Description: Configure NGINX Plus active health checks for IPv6 upstream servers, including health check URI configuration, slow start for IPv6 backends, and dashboard monitoring.

## Introduction

NGINX Plus extends the open source NGINX with active health checks - probing upstream servers on a schedule rather than detecting failures only from production traffic. This is particularly valuable for IPv6 backends where failures should be detected before users are affected. This guide covers NGINX Plus configuration for IPv6 active health checks.

## NGINX Plus Active Health Check Configuration

```nginx
# /etc/nginx/nginx.conf (NGINX Plus)

http {
    # IPv6 upstream with active health checks
    upstream app_ipv6 {
        zone app_ipv6_zone 256k;

        # IPv6 backends
        server [2001:db8::10]:8080 max_fails=3 fail_timeout=30s;
        server [2001:db8::11]:8080 max_fails=3 fail_timeout=30s;
        server [2001:db8::12]:8080 max_fails=3 fail_timeout=30s backup;

        # Slow start: don't immediately send full traffic to new servers
        # (NGINX Plus feature)
        # server [2001:db8::13]:8080 slow_start=30s;

        keepalive 32;
    }

    # Health check definitions
    match ipv6_backend_health {
        status 200 204;
        header Content-Type = application/json;
        body ~ '"status":"ok"';
    }

    server {
        listen [::]:80;
        listen 80;

        server_name app.example.com;

        location / {
            proxy_pass http://app_ipv6;
            proxy_set_header Host $host;
            proxy_set_header X-Forwarded-For $remote_addr;

            # NGINX Plus active health check
            health_check interval=10 fails=3 passes=2
                         uri=/health match=ipv6_backend_health;
        }

        # NGINX Plus status dashboard (via API module)
        location /nginx_status {
            api;
            allow 2001:db8:mgmt::/48;
            allow 10.0.0.0/8;
            deny all;
        }
    }
}
```

## TCP/UDP Health Checks for IPv6

```nginx
# Stream module for TCP/UDP IPv6 health checks

stream {
    upstream tcp_ipv6 {
        zone tcp_ipv6_zone 256k;
        server [2001:db8::10]:5432;
        server [2001:db8::11]:5432;
    }

    match tcp_health {
        # TCP connect success is sufficient
        send "SELECT 1;\n";
        expect ~ "^1$";
    }

    server {
        listen [::]:5432;
        proxy_pass tcp_ipv6;

        # Active health check for TCP IPv6
        health_check interval=10s fails=3 passes=2
                     match=tcp_health;
    }
}
```

## NGINX Plus Dynamic Configuration via API

```bash
# Add a new IPv6 upstream server dynamically
curl -s -X POST "http://[::1]:8080/api/9/http/upstreams/app_ipv6/servers" \
    -H "Content-Type: application/json" \
    -d '{"server": "[2001:db8::14]:8080", "weight": 1}'

# Check health of IPv6 upstream servers
curl -s "http://[::1]:8080/api/9/http/upstreams/app_ipv6/servers" | \
    python3 -m json.tool

# Expected output:
# [
#   {"id": 0, "server": "[2001:db8::10]:8080", "state": "up", "health_checks": {"last_passed": true}},
#   {"id": 1, "server": "[2001:db8::11]:8080", "state": "up", "health_checks": {"last_passed": true}},
# ]

# Drain an IPv6 server (graceful removal)
curl -s -X PATCH "http://[::1]:8080/api/9/http/upstreams/app_ipv6/servers/0" \
    -H "Content-Type: application/json" \
    -d '{"drain": true}'
```

## Health Check with Custom Headers

```nginx
# Health check that passes custom header (e.g., for authentication)
match ipv6_auth_health {
    status 200;
    header X-Health = "ok";
}

location /api/ {
    proxy_pass http://app_ipv6;
    health_check interval=15 fails=2 passes=2
                 uri=/health
                 match=ipv6_auth_health;
    health_check_timeout 5s;
}
```

## Monitor IPv6 Backend Status via Dashboard

```nginx
# NGINX Plus API and Dashboard
server {
    listen [::]:8080;

    # REST API for upstream management
    location /api {
        api write=on;
        allow 2001:db8:mgmt::/48;
        deny all;
    }

    # Dashboard
    location = /dashboard.html {
        root /usr/share/nginx/html;
    }
}
```

## Slow Start for IPv6 Backends

```nginx
# Slow start prevents overwhelming a newly added IPv6 server
upstream app_ipv6 {
    zone app_ipv6_zone 256k;
    server [2001:db8::10]:8080;
    server [2001:db8::11]:8080;
    # New server gets traffic gradually over 60 seconds
    server [2001:db8::13]:8080 slow_start=60s;
}
```

## Conclusion

NGINX Plus active health checks work identically for IPv6 backends as for IPv4 - specify IPv6 server addresses in bracket notation in the `upstream` block, and the `health_check` directive handles IPv6 probes automatically. Use `match` blocks to define expected response criteria beyond HTTP status codes. The NGINX Plus API enables dynamic upstream management without reload, which is particularly valuable for updating IPv6 server lists as infrastructure changes. The slow start feature prevents IPv6 backends from being overwhelmed immediately after being added to the pool.
