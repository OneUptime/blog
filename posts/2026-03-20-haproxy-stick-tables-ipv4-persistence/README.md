# How to Set Up HAProxy Stick Tables for IPv4 Client Session Persistence

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: HAProxy, Stick Tables, IPv4, Session Persistence, Sticky Sessions, Load Balancing

Description: Configure HAProxy stick tables to implement session persistence by routing IPv4 clients consistently to the same backend server based on source IP or cookies.

## Introduction

Stick tables are HAProxy's in-memory key-value store for tracking client state. Using a source IPv4 address as the key, HAProxy can route a returning client back to the same backend server, implementing sticky sessions without cookies. In HAProxy 3.2 and later, use `type ipv4` for IPv4-only tables; older releases use `type ip`.

## Source IP Persistence

The simplest form: track which server each client IPv4 was last sent to:

```haproxy
# /etc/haproxy/haproxy.cfg

frontend http_in
    bind 203.0.113.10:80
    mode http
    default_backend app_servers

backend app_servers
    balance roundrobin

    # Stick table: map client IPv4 to backend server
    # - type ipv4: key is client IPv4 address
    # - size 100k: store up to 100,000 entries
    # - expire 30m: remove entries after 30 minutes of inactivity
    stick-table type ipv4 size 100k expire 30m

    # Record which server the client was sent to
    stick on src

    server app1 192.168.1.10:8080 check
    server app2 192.168.1.11:8080 check
    server app3 192.168.1.12:8080 check
```

## Stick Table with Rate Tracking

Stick tables can store multiple counters per key:

```haproxy
frontend http_in
    bind 203.0.113.10:80
    mode http

    # Track multiple stats per source IP
    stick-table type ipv4 size 100k expire 60s \
        store conn_cur,conn_rate(30s),http_req_rate(60s),http_err_rate(60s)

    # Start tracking each client IPv4; HAProxy updates the stored counters
    tcp-request connection track-sc0 src

    # ACL based on tracked data
    acl too_many_connections  sc_conn_cur(0) gt 50
    acl too_many_requests     sc_http_req_rate(0) gt 200
    acl too_many_errors       sc_http_err_rate(0) gt 20

    # Block abusers
    http-request deny deny_status 429 if too_many_requests
    http-request deny deny_status 503 if too_many_connections

    default_backend app_servers
```

## Cookie-Based Persistence with Stick Tables

Combine cookies with stick tables for more reliable persistence:

```haproxy
backend app_servers
    balance roundrobin

    # Insert a persistence cookie naming which server handled the request
    cookie SERVERID insert indirect nocache

    # Learn the inserted cookie value from responses and match it on later requests
    stick-table type string len 32 size 100k expire 4h
    stick match req.cook(SERVERID)
    stick store-response res.cook(SERVERID)

    # Each server has a cookie value
    server app1 192.168.1.10:8080 check cookie app1
    server app2 192.168.1.11:8080 check cookie app2
    server app3 192.168.1.12:8080 check cookie app3
```

## Viewing and Managing Stick Table Entries

```bash
# List all entries in a stick table

echo "show table app_servers" | sudo socat stdio /run/haproxy/admin.sock

# Show entries for a specific source IP
echo "show table app_servers key 203.0.113.50" | \
  sudo socat stdio /run/haproxy/admin.sock

# Delete a specific entry (force re-routing a client)
echo "clear table app_servers key 203.0.113.50" | \
  sudo socat stdio /run/haproxy/admin.sock

# Clear all entries in a table
echo "clear table app_servers" | \
  sudo socat stdio /run/haproxy/admin.sock
```

## Stick Table Replication in HA Clusters

In a two-node HAProxy active/passive setup, replicate stick table state. On each node, make sure the local peer name matches one of the `peer` entries, either via the hostname or `global localpeer`:

```haproxy
peers my_peers
    peer haproxy1 192.168.0.1:1024
    peer haproxy2 192.168.0.2:1024

backend app_servers
    stick-table type ipv4 size 100k expire 30m peers my_peers
    stick on src

    server app1 192.168.1.10:8080 check
    server app2 192.168.1.11:8080 check
```

## Conclusion

HAProxy stick tables provide flexible, in-memory persistence keyed by IPv4 source addresses or other values such as cookies. Use `stick on src` for simple IP-based stickiness, `store http_req_rate(60s)` for request tracking and rate limiting, and request/response cookie matching when you want a stick table to learn cookie-based affinity. In HA deployments, configure `peers` to replicate stick table state between HAProxy instances so failover doesn't break client sessions.
