# How to Configure HAProxy Health Checks for IPv4 Backend Servers

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: HAProxy, Health Check, IPv4, Backend, Load Balancing, Monitoring

Description: Configure TCP and HTTP health checks in HAProxy to automatically detect and remove unhealthy IPv4 backend servers from the pool, with tunable intervals and thresholds.

## Introduction

HAProxy health checks continuously probe backend servers to determine if they are available. When a server fails a health check, HAProxy stops sending traffic to it. When it recovers, HAProxy automatically reintroduces it. Without health checks, HAProxy sends traffic to servers regardless of their state.

## Basic TCP Health Check

The `check` keyword enables TCP-level health checking:

```text
backend api-servers
    balance roundrobin
    server api1 10.0.1.10:8080 check
    server api2 10.0.1.11:8080 check
    server api3 10.0.1.12:8080 check
```

HAProxy opens a TCP connection to the server. If the connection succeeds, the server is healthy.

## HTTP Health Check

For application-level health checking:

```text
backend api-servers
    balance roundrobin
    option httpchk GET /health HTTP/1.1
    http-check send hdr Host api.internal
    http-check expect status 200
    server api1 10.0.1.10:8080 check
    server api2 10.0.1.11:8080 check
```

HAProxy sends an HTTP GET request and checks the response code.

## Custom Health Check Port

Check a different port than the traffic port:

```text
backend api-servers
    server api1 10.0.1.10:8080 check port 8090   # Traffic: 8080, Health: 8090
    server api2 10.0.1.11:8080 check port 8090
```

## Tuning Check Interval and Thresholds

```text
defaults
    timeout check 3s      # Additional read timeout after the check connection is established

backend api-servers
    balance roundrobin
    option httpchk GET /health
    server api1 10.0.1.10:8080 check inter 5000 rise 2 fall 3
    server api2 10.0.1.11:8080 check inter 5000 rise 2 fall 3
```

- `inter 5000`: Check every 5000ms (5 seconds)
- `rise 2`: Mark server UP after 2 consecutive successful checks
- `fall 3`: Mark server DOWN after 3 consecutive failed checks

## Using fastinter and downinter

```text
backend api-servers
    server api1 10.0.1.10:8080 check inter 5000 fastinter 1000 downinter 2000 rise 3 fall 2
```

- `fastinter 1000`: Check every 1 second when transitioning state (faster detection)
- `downinter 2000`: Check every 2 seconds when the server is fully DOWN

## External (Agent) Health Check

Use an agent running on the backend to report health and weight dynamically:

```text
backend api-servers
    server api1 10.0.1.10:8080 check agent-check agent-port 9999 agent-inter 10000
```

The agent on port 9999 responds with status strings like `ready`, `drain`, `maint`, or `50%` (weight).

## Monitoring Health Check Results

```bash
# View server states via HAProxy socket

echo "show servers state api-servers" | sudo socat /run/haproxy/admin.sock stdio
```

Output includes fields such as:
- `srv_op_state`: `0` = STOPPED (DOWN), `2` = RUNNING (fully UP)
- `srv_admin_state`: `0x08` = forced DRAIN (stops new load-balanced connections)

## MySQL/PostgreSQL Custom Health Check

```text
backend db-servers
    mode tcp
    option mysql-check user haproxy
    server db1 10.0.2.10:3306 check
```

```text
backend pg-servers
    mode tcp
    option pgsql-check user haproxy
    server pg1 10.0.2.20:5432 check
```

## Conclusion

Enable health checks with `check` on each server. Use `option httpchk` for application-level HTTP checks with `http-check expect` to validate response codes. Tune `inter`, `rise`, and `fall` to balance detection speed against flapping. For databases, use `option mysql-check` or `option pgsql-check` for protocol-aware checks.
