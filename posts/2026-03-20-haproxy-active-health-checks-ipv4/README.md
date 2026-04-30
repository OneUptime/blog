# How to Set Up HAProxy Active Health Checks for IPv4 Backend Servers

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: HAProxy, Health Check, IPv4, High Availability, Monitoring, Backend

Description: Configure HAProxy active health checks to continuously monitor IPv4 backend server availability and automatically remove unhealthy servers from the load balancing pool.

## Introduction

HAProxy actively probes backends on a configurable schedule, removing failed servers from rotation before they affect real user traffic. Unlike passive checks that rely on client requests to detect failures, active checks provide proactive monitoring.

## Basic TCP Health Check

The default health check establishes a TCP connection to verify the port is open:

```haproxy
backend web_servers
    balance roundrobin

    # check: enable health checks
    # inter 3s: check every 3 seconds
    # fall 3: mark down after 3 consecutive failures
    # rise 2: mark up after 2 consecutive successes
    server web1 192.168.1.10:8080 check inter 3s fall 3 rise 2
    server web2 192.168.1.11:8080 check inter 3s fall 3 rise 2
    server web3 192.168.1.12:8080 check inter 3s fall 3 rise 2
```

## HTTP Health Checks

Check a specific URL and expected response:

```haproxy
backend api_servers
    # Use HTTP health check
    option httpchk

    # Check method, path, and HTTP version
    http-check send meth GET uri /health ver HTTP/1.1 hdr Host api.example.com

    # Expect HTTP 200 response
    http-check expect status 200

    server api1 192.168.2.10:8080 check inter 5s fall 3 rise 2
    server api2 192.168.2.11:8080 check inter 5s fall 3 rise 2
```

## Checking on a Different Port

Check the health endpoint on a separate port (keeping main traffic port separate):

```haproxy
backend app_servers
    option httpchk GET /health

    # Traffic goes to port 8080, health check uses port 8081
    server app1 192.168.1.10:8080 check port 8081 inter 3s
    server app2 192.168.1.11:8080 check port 8081 inter 3s
```

## Database-Specific Health Checks

Use HAProxy's built-in MySQL health check:

```haproxy
backend mysql_servers
    mode tcp
    # Requires an authorized MySQL user without a password
    option mysql-check user haproxy

    server db1 192.168.3.10:3306 check inter 5s fall 3 rise 2
    server db2 192.168.3.11:3306 check inter 5s fall 3 rise 2
```

For Redis:

```haproxy
backend redis_servers
    mode tcp
    option tcp-check

    tcp-check connect
    tcp-check send PING\r\n
    tcp-check expect string +PONG

    server redis1 192.168.4.10:6379 check inter 5s
    server redis2 192.168.4.11:6379 check inter 5s
```

## Health Check Logging

Enable logging for health check state changes:

```haproxy
global
    log /dev/log local0

defaults
    log global
    # Log health check state changes
    option log-health-checks
```

```bash
# Monitor health check events

sudo journalctl -u haproxy -f | grep "health check"

# Or from syslog
tail -f /var/log/haproxy.log | grep "server.*is DOWN\|server.*is UP"
```

## Managing Server States Manually

```bash
# Manually disable a server (drain connections first)
echo "set server app_servers/app1 state drain" | \
  sudo socat stdio /run/haproxy/admin.sock

# Bring server back
echo "set server app_servers/app1 state ready" | \
  sudo socat stdio /run/haproxy/admin.sock

# Force-disable without draining
echo "set server app_servers/app1 state maint" | \
  sudo socat stdio /run/haproxy/admin.sock

# View current server states
echo "show servers state" | sudo socat stdio /run/haproxy/admin.sock | column -t
```

## Conclusion

HAProxy active health checks run independently of client traffic, giving you real-time backend health visibility. Use HTTP checks with specific paths and expected status codes for application-level verification, check on dedicated health ports to avoid interfering with production traffic, and enable `option log-health-checks` to audit server state transitions. The admin socket lets you manually override server states for maintenance without config changes.
