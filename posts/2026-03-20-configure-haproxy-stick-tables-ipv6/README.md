# How to Configure HAProxy Stick Tables for IPv6 Clients

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, HAProxy, Stick Tables, Session Persistence, Load Balancer

Description: Learn how to configure HAProxy stick tables with IPv6 client addresses for session persistence, rate limiting, and connection tracking with IPv6 clients.

## IPv6 Stick Table for Session Persistence

```haproxy
backend ipv6_sticky
    balance roundrobin

    # Stick table keyed by client IPv6 address
    stick-table type ipv6 size 100k expire 30m

    # Track client IPv6 and stick to a server
    stick on src

    server app1 [2001:db8::10]:8080 check
    server app2 [2001:db8::11]:8080 check
    server app3 [2001:db8::12]:8080 check
```

## IPv6 Rate Limiting with Stick Table

```haproxy
frontend http_front
    bind *:80
    bind [::]:80

    # Define stick table for rate limiting
    # ipv6 type stores IPv6 address as key
    stick-table type ipv6 size 100k expire 60s store http_req_rate(60s)

    # Track source IPv6 address
    http-request track-sc0 src

    # Deny if more than 100 requests per minute
    acl rate_limit_exceeded sc_http_req_rate(0) gt 100
    http-request deny status 429 if rate_limit_exceeded

    default_backend app_servers
```

## Connection Limiting per IPv6 Address

```haproxy
frontend http_front
    bind *:80
    bind [::]:80

    # Track concurrent connections per IPv6 address
    stick-table type ipv6 size 100k expire 10m store conn_cur

    tcp-request connection track-sc0 src
    tcp-request connection reject if { sc_conn_cur(0) gt 100 }

    default_backend app_servers
```

## Multiple Counters in One Stick Table

```haproxy
frontend http_front
    bind *:80
    bind [::]:80

    # Store multiple metrics per IPv6 address
    stick-table type ipv6 size 100k expire 60s \
        store http_req_rate(60s),conn_cur,bytes_in_rate(1s)

    # Track all metrics
    http-request track-sc0 src

    # Rate limit checks
    acl too_many_requests sc_http_req_rate(0) gt 200
    acl too_many_connections sc_conn_cur(0) gt 50
    acl too_much_data sc_bytes_in_rate(0) gt 1000000  # 1MB/s

    http-request deny status 429 if too_many_requests
    http-request deny status 429 if too_many_connections
    http-request deny status 429 if too_much_data

    default_backend app_servers
```

## Stick Table with IPv6 /64 Prefix Granularity

```haproxy
# IPv6 clients may use multiple addresses (privacy extensions)

# Track the /64 prefix instead of the full IPv6 address
backend ipv6_prefix_sticky
    balance roundrobin

    stick-table type ipv6 size 100k expire 30m
    stick on src,ipmask(32,64)

    server app1 [2001:db8::10]:8080 check
    server app2 [2001:db8::11]:8080 check
    server app3 [2001:db8::12]:8080 check

# Alternative: use cookie-based persistence for IPv6
backend ipv6_cookie_sticky
    balance roundrobin
    cookie SERVERID insert indirect nocache

    server app1 [2001:db8::10]:8080 check cookie server1
    server app2 [2001:db8::11]:8080 check cookie server2
```

## View Stick Table Contents

```bash
# Show stick table entries
echo "show table http_front" | socat stdio /var/run/haproxy/admin.sock

# Output:
# # table: http_front, type: ipv6, size:102400, used:15
# 0x55b2c4b2e0a0: key=2001:db8::10 use=0 exp=59834 http_req_rate(60000)=12

# Clear a specific entry
echo "clear table http_front key 2001:db8::10" | socat stdio /var/run/haproxy/admin.sock

# Show only entries with high request rate
echo "show table http_front data.http_req_rate gt 50" | \
    socat stdio /var/run/haproxy/admin.sock
```

## Summary

Configure HAProxy stick tables for IPv6 with `stick-table type ipv6 size 100k expire 30m` and track sources with `stick on src`. For rate limiting, add `store http_req_rate(60s)` and check with `sc_http_req_rate(0) gt 100`. For /64 grouping, use `stick on src,ipmask(32,64)`. Note that IPv6 privacy extensions mean clients may rotate addresses, making per-address tracking less effective than cookie-based persistence. View table contents with `echo "show table <name>" | socat stdio /var/run/haproxy/admin.sock`.
