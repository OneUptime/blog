# How to Track IPv4 Client Connections with HAProxy Stick Tables

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: HAProxy, Stick Tables, IPv4, Session Persistence, Rate Limiting, Load Balancing

Description: Learn how to use HAProxy stick tables to track IPv4 client connections, implement session persistence, and apply per-IP rate limiting.

---

HAProxy stick tables are in-memory key-value stores keyed on client attributes (typically the IPv4 source address). They enable session persistence, connection counting, rate limiting, and abuse detection within an HAProxy instance. With `peers`, stick table data can also be synchronized across HAProxy nodes, except for local-only counters such as `conn_cur`.

## What Stick Tables Store

Each stick table entry can track multiple counters per key:

| Counter | Description |
|---------|-------------|
| `conn_cur` | Current active connections |
| `conn_rate(10s)` | Average connection rate over 10 seconds |
| `http_req_rate(10s)` | Average HTTP request rate over 10 seconds |
| `bytes_in_rate(1m)` | Average incoming byte rate over 1 minute |
| `gpc0` | General-purpose counter 0 |

## Session Persistence with Stick Tables

Route returning clients to the same backend server using their IPv4 source address.

```haproxy
backend web_servers
    balance roundrobin

    # Stick table: keyed on IPv4 source address, up to 1M entries, 30min TTL
    stick-table type ip size 1m expire 30m

    # On first visit, record which server the client was sent to
    stick on src

    server web1 10.0.0.1:80 check
    server web2 10.0.0.2:80 check
    server web3 10.0.0.3:80 check
```

## Counting Concurrent Connections per IPv4 Address

```haproxy
frontend http_in
    bind 0.0.0.0:80
    mode http

    # Track current connections per source IPv4 address
    stick-table type ip size 200k expire 10m store conn_cur,conn_rate(10s)
    tcp-request connection track-sc0 src

    # Deny clients that have more than 100 concurrent connections
    acl too_many_conns sc_conn_cur(0) gt 100
    tcp-request connection reject if too_many_conns
```

## Per-IP Rate Limiting (HTTP Request Rate)

```haproxy
frontend http_in
    bind 0.0.0.0:80
    mode http

    # Track HTTP request rate per source IPv4 over a 10-second period
    stick-table type ip size 200k expire 30s store http_req_rate(10s)
    http-request track-sc0 src

    # Return 429 Too Many Requests if more than 100 req/10s
    acl rate_limited sc_http_req_rate(0) gt 100
    http-request deny deny_status 429 if rate_limited
```

## Sharing Stick Tables Across HAProxy Instances (Peers)

```haproxy
# Define peer synchronization so multiple HAProxy nodes share stick table data

peers my_cluster
    peer haproxy1 192.168.1.11:1024
    peer haproxy2 192.168.1.12:1024

backend sticky_app
    stick-table type ip size 1m expire 30m peers my_cluster
    stick on src
    server app1 10.0.0.1:8080 check
    server app2 10.0.0.2:8080 check
```

Peer replication can synchronize stored stick table data across HAProxy instances, but `conn_cur` remains local by default.

## Viewing Stick Table Contents

```bash
# Assuming a Runtime API socket is configured at /var/run/haproxy/admin.sock, show all entries in the stick table named 'http_in'
echo "show table http_in" | socat stdio /var/run/haproxy/admin.sock

# Filter to a specific IPv4 key
echo "show table http_in key 203.0.113.5" | socat stdio /var/run/haproxy/admin.sock
```

## Key Takeaways

- Stick tables persist per-client data between requests and connections for each IPv4 source.
- Use `stick on src` for IP-based session persistence without cookies.
- Combine `conn_cur` and `conn_rate(10s)` tracking to implement per-IP connection limits.
- Use `peers` to synchronize stick tables across multiple HAProxy instances, noting that `conn_cur` is local-only by default.
