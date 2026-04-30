# How to Configure HAProxy Connection Limits per IPv4 Client

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: HAProxy, Connection Limit, IPv4, Security, Stick Tables, DDoS Protection

Description: Configure HAProxy to limit concurrent connections from individual IPv4 addresses using stick tables, protecting backend servers from connection exhaustion attacks.

## Introduction

Limiting connections per IPv4 client prevents one client from monopolizing backend resources. HAProxy implements this through stick tables that track concurrent connection counts per source IP.

## Basic Connection Limit per IP

```haproxy
# /etc/haproxy/haproxy.cfg

frontend http_in
    bind 203.0.113.10:80
    mode http

    # Track concurrent connections per source IP
    # conn_cur: current concurrent connections from this IP
    stick-table type ip size 100k expire 60s store conn_cur

    # Increment counter on connection open, decrement on close
    tcp-request connection track-sc0 src

    # Reject if client already has 50+ concurrent connections
    tcp-request connection reject if { sc_conn_cur(0) gt 50 }

    default_backend app_servers
```

## Combined Connection and Rate Limits

```haproxy
frontend api_in
    bind 203.0.113.10:443 ssl crt /etc/haproxy/certs/bundle.pem
    mode http

    # Track multiple metrics: current connections and connection rate
    stick-table type ip size 100k expire 120s \
        store conn_cur,conn_rate(10s),http_req_rate(60s)

    tcp-request connection track-sc0 src

    # Define limit ACLs
    acl too_many_concurrent    sc_conn_cur(0) gt 30
    acl too_high_rate          sc_conn_rate(0) gt 20      # >20 new conn/10s
    acl too_many_requests      sc_http_req_rate(0) gt 200  # >200 req/min

    # Block abusive connections
    tcp-request connection reject if too_many_concurrent
    tcp-request connection reject if too_high_rate

    # Block at HTTP level for request rate
    http-request deny deny_status 429 if too_many_requests

    default_backend api_servers
```

## Whitelist Trusted IPs from Connection Limits

```haproxy
frontend http_in
    bind 203.0.113.10:80
    mode http

    stick-table type ip size 100k expire 60s store conn_cur

    acl is_trusted src 10.0.0.0/8 192.168.0.0/16

    # Only track untrusted clients
    tcp-request connection track-sc0 src if !is_trusted

    # Apply limit only to tracked (untrusted) clients
    tcp-request connection reject if !is_trusted { sc_conn_cur(0) gt 50 }

    default_backend app_servers
```

## Per-Backend Connection Limits

HAProxy does not support a hard `maxconn` on `backend` sections. Use per-server limits inside the backend:

```haproxy
backend database_servers
    server db1 192.168.1.10:5432 check maxconn 200   # Per-server limit
    server db2 192.168.1.11:5432 check maxconn 200
    server db3 192.168.1.12:5432 check maxconn 100
```

## Global Connection Limits

```haproxy
global
    maxconn 100000     # Per-process connection limit

defaults
    maxconn 10000      # Default limit for following frontends/listens

frontend http_in
    maxconn 5000       # Override for this frontend only
    bind 203.0.113.10:80
```

## Viewing Connection Counts Per IP

```bash
# Show stick table contents with connection counts

echo "show table http_in" | sudo socat stdio /run/haproxy/admin.sock

# Sample output:
# # table: http_in, type: ip, size:102400, used:5
# 0x...: key=203.0.113.50 use=0 exp=55000 conn_cur=8

# Find IPs with 20+ concurrent connections
echo "show table http_in data.conn_cur gt 19" | sudo socat stdio /run/haproxy/admin.sock

# Remove a specific IP's entry
echo "clear table http_in key 203.0.113.50" | sudo socat stdio /run/haproxy/admin.sock
```

## Conclusion

Per-IP connection limiting in HAProxy uses stick tables with `conn_cur` storage to track concurrent connections. Apply `tcp-request connection reject` for efficient TCP-level blocking before any HTTP processing. Always whitelist trusted internal networks, combine with connection rate limits for comprehensive protection, and monitor stick table contents during incidents to identify attacking IPs quickly.
