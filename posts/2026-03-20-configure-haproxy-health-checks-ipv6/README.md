# How to Configure HAProxy Health Checks over IPv6

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, HAProxy, Health Check, Backend Monitoring, Load Balancer

Description: Learn how to configure HAProxy health checks for IPv6 backend servers, including TCP checks, HTTP checks, and advanced health check configurations.

## Basic TCP Health Check for IPv6 Backends

```haproxy
backend ipv6_servers
    # Simple TCP health check (default)
    server app1 [2001:db8::10]:8080 check
    server app2 [2001:db8::11]:8080 check

    # Check interval, rise, fall settings
    # check inter 5s = check every 5 seconds
    # rise 2 = need 2 successes to mark UP
    # fall 3 = need 3 failures to mark DOWN
    server app3 [2001:db8::12]:8080 check inter 5s rise 2 fall 3
```

## HTTP Health Check for IPv6 Backends

```haproxy
backend ipv6_web_servers
    mode http
    balance roundrobin

    # HTTP health check
    option httpchk GET /health HTTP/1.1
    http-check send hdr Host example.com

    # Require specific HTTP status code
    http-check expect status 200

    server web1 [2001:db8::10]:80 check
    server web2 [2001:db8::11]:80 check
```

## Advanced HTTP Health Check

```haproxy
backend ipv6_api_servers
    mode http
    option httpchk

    # Check specific endpoint with headers
    http-check send meth GET uri /health/ready ver HTTP/1.1 \
        hdr Host api.example.com \
        hdr Authorization "Bearer healthcheck-token"

    # Accept multiple valid responses
    http-check expect rstatus ^(200|204)$

    server api1 [2001:db8::21]:3000 check inter 10s
    server api2 [2001:db8::22]:3000 check inter 10s
```

## SSL Health Check for HTTPS Backends

```haproxy
backend ipv6_https_servers
    mode http

    # HTTPS with certificate verification
    option httpchk GET /health HTTP/1.1
    http-check send hdr Host app.example.com
    http-check expect status 200

    server app1 [2001:db8::10]:443 check ssl verify required \
        ca-file @system-ca

    # Without certificate verification (for self-signed certs)
    server app2 [2001:db8::11]:443 check ssl verify none
```

## Health Check Timing and Tuning

```haproxy
backend ipv6_servers
    # Different check intervals for different scenarios
    # Fast check for latency-sensitive apps
    server app1 [2001:db8::10]:8080 check inter 2s fastinter 1s downinter 10s rise 2 fall 2

    # Explanation:
    # inter 2s     = check every 2s when in normal state
    # fastinter 1s = check every 1s when transitioning states
    # downinter 10s = check every 10s when server is DOWN
    # rise 2       = 2 consecutive successes to mark UP
    # fall 2       = 2 consecutive failures to mark DOWN
```

## External Health Check Agent

```haproxy
backend ipv6_servers
    # Use an external health check agent on a separate port
    server app1 [2001:db8::10]:8080 check agent-check agent-addr 2001:db8::10 agent-port 9999

    # The agent at port 9999 can return:
    # "up\n"    = mark the server UP if regular checks also pass
    # "down\n"  = mark the server DOWN
    # "drain\n" = put the server in drain mode
```

## View Health Check Status

```bash
# Check backend server status

echo "show servers state" | socat stdio /var/run/haproxy/admin.sock

# Output shows:
# server name, status, health check state, etc.

# Via stats page (if configured)
cat >> /etc/haproxy/haproxy.cfg << 'EOF'
frontend stats
    bind [::]:8404
    bind *:8404
    stats enable
    stats uri /stats
    stats refresh 10s
    stats auth admin:password
EOF

# Access: http://[2001:db8::100]:8404/stats
```

## Summary

Configure HAProxy health checks for IPv6 backends with `server app1 [2001:db8::10]:PORT check`. Use `option httpchk GET /health HTTP/1.1` with `http-check send hdr Host example.com` and `http-check expect status 200` for HTTP-level checks. Tune timing with `inter`, `fastinter`, `downinter`, `rise`, and `fall` parameters. For HTTPS backends, add `ssl verify required ca-file @system-ca` or `ssl verify none`. Monitor health status via `echo "show servers state" | socat stdio /var/run/haproxy/admin.sock` or the stats web interface.
