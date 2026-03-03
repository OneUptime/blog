# How to Set Up HAProxy Health Checks on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, HAProxy, Load Balancing, High Availability, Monitoring

Description: Configure HAProxy health checks on Ubuntu to automatically detect failed backend servers and route traffic only to healthy nodes, with TCP, HTTP, and custom health check options.

---

HAProxy health checks determine whether a backend server is ready to receive traffic. Without them, HAProxy will send requests to servers that may be down, leading to failed requests for users. With properly configured health checks, HAProxy automatically marks unhealthy servers as down, routes traffic to healthy ones, and brings servers back into rotation when they recover. This guide covers the full range of health check options.

## How HAProxy Health Checks Work

HAProxy polls backend servers at a configurable interval. If a server fails to respond (or responds incorrectly) a configured number of times, it is marked as DOWN. When it starts responding correctly, it is marked UP again. Transitions happen automatically without any manual intervention.

The basic flow:
1. HAProxy sends a probe to the backend at the configured interval
2. If the probe fails N times in a row, the server is marked DOWN
3. Requests are no longer sent to the DOWN server
4. HAProxy keeps probing; if N consecutive probes succeed, the server is marked UP
5. Traffic resumes to the recovered server

## Basic TCP Health Check

The simplest health check: verify a TCP connection can be established.

```bash
sudo nano /etc/haproxy/haproxy.cfg
```

```text
backend app_servers
    balance roundrobin

    # TCP health check - just verifies the port is open
    # option tcp-check is implied when check keyword is used without HTTP mode
    server app1 10.0.0.10:3000 check
    server app2 10.0.0.11:3000 check
    server app3 10.0.0.12:3000 check
```

The `check` keyword at the end of each server line enables health checks. HAProxy will connect to the server's port and verify the connection succeeds.

## HTTP Health Checks

For web applications, check that the application is actually responding correctly:

```text
backend web_app
    balance roundrobin

    # Enable HTTP mode
    option httpchk

    # Customize the health check request
    # HAProxy sends: GET /health HTTP/1.1\r\nHost: example.com\r\n
    http-check send meth GET uri /health ver HTTP/1.1 hdr Host example.com

    # Expect a 200 response (default behavior)
    # http-check expect status 200

    # Or expect status to match a regex
    # http-check expect rstring ^(200|204)$

    # Check interval and timeout settings per-server
    server app1 10.0.0.10:80 check inter 10s fall 3 rise 2
    server app2 10.0.0.11:80 check inter 10s fall 3 rise 2
```

Health check options:
- `inter N` - Interval between checks (default 2000ms)
- `fall N` - Mark server DOWN after N consecutive failures (default 3)
- `rise N` - Mark server UP after N consecutive successes (default 2)
- `timeout check N` - Timeout for individual health check (default: timeout connect)

## Checking HTTP Response Content

Verify that the health endpoint returns expected content, not just a 200 status:

```text
backend api_servers
    balance leastconn
    option httpchk

    # Check for specific content in the response
    http-check send meth GET uri /api/health ver HTTP/1.1 hdr Host api.example.com
    http-check expect string "\"status\":\"ok\""

    # Or check for a pattern
    # http-check expect rstring "status.*healthy"

    # Log the health check result
    option log-health-checks

    server api1 10.0.0.20:8080 check inter 5s fall 2 rise 3
    server api2 10.0.0.21:8080 check inter 5s fall 2 rise 3
```

## Using a Separate Health Check Port

Some applications expose health endpoints on a different port than the main service:

```text
backend app_with_health_port
    balance roundrobin
    option httpchk

    http-check send meth GET uri /health ver HTTP/1.1

    # addr overrides the IP for health checks
    # port overrides the port for health checks
    server app1 10.0.0.10:8080 check addr 10.0.0.10 port 8888
    server app2 10.0.0.11:8080 check addr 10.0.0.11 port 8888
```

## Advanced HTTP/2 and gRPC Health Checks

For gRPC services:

```text
backend grpc_backend
    balance roundrobin

    option httpchk
    http-check send meth GET uri /grpc.health.v1.Health/Check

    # gRPC health responses use HTTP/2
    server grpc1 10.0.0.30:50051 check proto h2

    # Or use the gRPC health check standard
    # http-check expect status 0
```

## TCP Custom Check with Commands

For databases and other non-HTTP services:

```text
backend mysql_backend
    mode tcp
    balance roundrobin

    # Custom TCP check: connect and verify MySQL greeting
    option tcp-check
    tcp-check connect
    tcp-check expect binary 0a   # Wait for MySQL greeting packet starting with 0x0a

    server db1 10.0.0.40:3306 check inter 5s
    server db2 10.0.0.41:3306 check inter 5s backup
```

For Redis:

```text
backend redis_backend
    mode tcp
    balance roundrobin

    option tcp-check
    tcp-check connect
    tcp-check send "PING\r\n"
    tcp-check expect string "+PONG"

    server redis1 10.0.0.50:6379 check inter 3s
    server redis2 10.0.0.51:6379 check inter 3s backup
```

## HTTPS Backend Health Checks

When backends use SSL:

```text
backend https_backends
    balance roundrobin
    option httpchk
    http-check send meth GET uri /health ver HTTP/1.1

    # Enable SSL for the backend connection
    server app1 10.0.0.10:443 check ssl verify none inter 10s
    server app2 10.0.0.11:443 check ssl verify required ca-file /etc/ssl/certs/ca-certificates.crt
```

## External Agent Checks

HAProxy can ask an external agent (a small TCP service) whether a backend is healthy. This allows application-controlled capacity management:

```text
backend app_with_agent
    balance roundrobin

    # Enable agent check (runs in parallel with regular checks)
    # The agent listens on port 9000 and returns a weight or status
    server app1 10.0.0.10:8080 check agent-check agent-port 9000

    # The agent protocol is simple:
    # Return "ready" or "up" to signal up
    # Return "drain" to gradually remove from rotation
    # Return "down" to take offline immediately
    # Return "10%" to set server weight to 10% of configured weight
```

A minimal agent script:

```bash
#!/bin/bash
# /usr/local/bin/haproxy-agent.sh
# Simple agent that checks application health

# Check if application is healthy
if /usr/local/bin/check-app-health.sh; then
    echo "ready"
else
    echo "down"
fi
```

Host the agent as a simple TCP service:

```bash
# Run with ncat or socat
socat TCP-LISTEN:9000,fork,reuseaddr EXEC:/usr/local/bin/haproxy-agent.sh
```

## Health Check Logging

Enable logging of health check state changes:

```text
defaults
    log global
    option log-health-checks  # Log transitions between UP and DOWN

backend app_servers
    balance roundrobin
    option httpchk
    http-check send meth GET uri /health
    option log-health-checks  # Per-backend override

    server app1 10.0.0.10:80 check
    server app2 10.0.0.11:80 check
```

View health check logs:

```bash
# View HAProxy logs
sudo journalctl -u haproxy -f | grep -E "health|UP|DOWN"

# Or if logging to syslog
sudo tail -f /var/log/haproxy.log | grep -E "Server.*UP|Server.*DOWN"
```

## Monitoring Health Check Status

```bash
# Enable the HAProxy stats page
frontend stats_frontend
    bind *:8404
    stats enable
    stats uri /haproxy-stats
    stats auth admin:secretpassword
    stats refresh 5s
    stats show-legends
    stats show-node
```

Use the HAProxy socket for real-time status:

```bash
# Check server status via socket
echo "show servers state" | sudo socat - /run/haproxy/admin.sock

# Show health check details
echo "show servers health" | sudo socat - /run/haproxy/admin.sock

# Manually take a server down for maintenance
echo "set server app_servers/app1 state drain" | sudo socat - /run/haproxy/admin.sock

# Bring it back
echo "set server app_servers/app1 state ready" | sudo socat - /run/haproxy/admin.sock

# Check current server weights and status
echo "show backend" | sudo socat - /run/haproxy/admin.sock
```

## Slow Start After Recovery

Prevent overwhelming a recovered server with a flood of requests:

```text
backend gradual_recovery
    balance roundrobin
    option httpchk

    # Gradually increase traffic over 60 seconds after recovery
    # starts at 1% of configured weight, increases to 100% over slowstart duration
    server app1 10.0.0.10:80 check slowstart 60s
    server app2 10.0.0.11:80 check slowstart 60s
```

## Testing Health Checks

```bash
# Reload after configuration changes
sudo haproxy -c -f /etc/haproxy/haproxy.cfg && sudo systemctl reload haproxy

# Simulate a backend failing and observe behavior
# Stop one backend app and watch HAProxy remove it
sudo systemctl stop myapp  # on a backend server

# Watch HAProxy detect the failure
sudo journalctl -u haproxy -f

# Verify HAProxy stops sending traffic to the failed server
# by checking your application logs or the stats page
```

Proper health checks are the foundation of a reliable load-balanced setup. A backend with health checks configured requires no manual intervention when servers fail and recover - HAProxy handles it automatically.
