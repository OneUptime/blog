# How to Set Up Nginx Health Checks for IPv4 Upstream Servers

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Nginx, Health Check, IPv4, Upstream, High Availability, Monitoring

Description: Configure passive and active health checks in Nginx to automatically detect and remove failed IPv4 upstream servers from the load balancing pool.

## Introduction

Nginx supports two types of health checks: **passive** (built into open-source Nginx-detects failures from real traffic) and **active** (Nginx Plus only-probes backends proactively). This guide covers both, with a workaround for active checks using open-source Nginx.

## Passive Health Checks (Open-Source Nginx)

Passive checks monitor real proxy responses. When a server fails enough requests within a time window, Nginx removes it from rotation:

```nginx
# /etc/nginx/conf.d/upstream-health.conf

upstream app_backends {
    server 192.168.1.10:8080 max_fails=3 fail_timeout=30s;
    server 192.168.1.11:8080 max_fails=3 fail_timeout=30s;
    server 192.168.1.12:8080 max_fails=3 fail_timeout=30s;
    # max_fails=3: mark server down after 3 failures within the fail_timeout window
    # fail_timeout=30s: keep it out of rotation for 30 seconds,
    #                   also the window in which failures are counted
}

server {
    listen 80;

    location / {
        proxy_pass http://app_backends;
        proxy_connect_timeout 3s;   # Fast timeout to detect dead servers quickly
        proxy_read_timeout 10s;
        proxy_next_upstream error timeout http_500 http_502 http_503;
        # Retry request on the next backend if the chosen one fails
    }
}
```

## Active Health Checks (Nginx Plus)

With Nginx Plus, add a `health_check` directive to actively probe backends:

```nginx
upstream app_backends {
    zone backend_zone 64k;  # Required for active health checks

    server 192.168.1.10:8080;
    server 192.168.1.11:8080;
    server 192.168.1.12:8080;
}

server {
    listen 80;

    location / {
        proxy_pass http://app_backends;

        # Active health check: probe every 5s, pass if status 200
        health_check interval=5s fails=3 passes=2 uri=/health;
    }
}
```

## Open-Source Active Health Check with Lua

For open-source Nginx, use `nginx_upstream_check_module` or a Lua-based solution:

```nginx
# With OpenResty or nginx-lua module:

# /etc/nginx/conf.d/healthcheck.conf

upstream app_backends {
    server 192.168.1.10:8080;
    server 192.168.1.11:8080;

    # nginx_upstream_check_module syntax
    check interval=3000 rise=2 fall=3 timeout=1000 type=http;
    check_http_send "GET /health HTTP/1.0\r\nHost: localhost\r\n\r\n";
    check_http_expect_alive http_2xx;
}
```

## Health Check Endpoint on Backends

Backends should expose a lightweight `/health` endpoint:

```python
# Flask example health endpoint
from flask import Flask, jsonify
app = Flask(__name__)

@app.route('/health')
def health():
    # Check DB connectivity, cache availability, etc.
    return jsonify({"status": "ok"}), 200
```

```bash
# Simple shell-based check using curl
curl -sf http://192.168.1.10:8080/health && echo "UP" || echo "DOWN"
```

## Monitoring Backend Status

View the current state of backends using the Nginx Plus API (per-upstream server state is not exposed by the open-source `stub_status` module, which reports only aggregate connection and request stats):

```bash
# Nginx Plus: list backend server states
curl http://localhost/api/9/http/upstreams/app_backends/servers | jq .

# Look for "state": "unhealthy" to identify failed servers
```

## Testing Failover

Simulate a backend failure to verify Nginx removes it correctly:

```bash
# Stop one backend
ssh 192.168.1.10 "sudo systemctl stop app-server"

# Send requests-they should all succeed on remaining backends
for i in $(seq 1 20); do
    curl -s -o /dev/null -w "%{http_code} %{time_total}s\n" http://example.com/
done
```

## Conclusion

Passive health checks with `max_fails` and `fail_timeout` provide baseline protection for open-source Nginx with zero additional dependencies. Pair `proxy_next_upstream` to retry failed requests transparently. For production environments requiring proactive detection, consider Nginx Plus active health checks or the upstream check module for OpenResty.
