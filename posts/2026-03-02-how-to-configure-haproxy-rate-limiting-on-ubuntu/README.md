# How to Configure HAProxy Rate Limiting on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, HAProxy, Rate Limiting, Security, Load Balancing

Description: Configure rate limiting in HAProxy on Ubuntu to protect backend services from traffic floods, brute force attacks, and abuse using stick tables and ACLs.

---

HAProxy's rate limiting is built around stick tables - in-memory data structures that track counters per IP address (or per any other attribute). You define a stick table that stores connection counts, then write ACLs that check those counts and take action when thresholds are exceeded. This guide covers practical rate limiting scenarios using HAProxy's stick table mechanism.

## How Stick Tables Work

A stick table is a hash table stored in HAProxy's memory. Each entry has:
- A key (usually the client IP address)
- One or more counters (connection count, request rate, error rate, etc.)
- An expiry time

You create a stick table by adding it to a backend, then reference it from a frontend to track and act on counters.

## Installing and Configuring HAProxy

```bash
sudo apt update
sudo apt install haproxy

# Check version - stick table features vary by version
haproxy -v

sudo systemctl enable haproxy
```

## Basic Connection Rate Limiting

Limit the number of new connections per IP per time window:

```bash
sudo nano /etc/haproxy/haproxy.cfg
```

```
global
    log /dev/log local0
    maxconn 50000
    user haproxy
    group haproxy
    daemon

defaults
    mode http
    log global
    option httplog
    option forwardfor
    timeout connect 5s
    timeout client 30s
    timeout server 30s

# Stick table backend - holds the rate limiting data
# This backend exists only to host the stick table, not to serve traffic
backend rate_limit_table
    stick-table type ip size 1m expire 30s store conn_cur,conn_rate(30s),http_req_rate(10s),http_err_rate(10s)

frontend http_front
    bind *:80
    bind *:443 ssl crt /etc/ssl/haproxy/combined.pem

    # Track the connection using client IP
    # "table rate_limit_table" tells HAProxy which stick table to use
    http-request track-sc0 src table rate_limit_table

    # Deny if the client has more than 100 requests in the last 10 seconds
    acl too_many_requests sc_http_req_rate(0) gt 100

    # Deny if the client has more than 50 concurrent connections
    acl too_many_connections sc_conn_cur(0) gt 50

    # Log the offending requests before denying
    http-request capture req.hdr(Host) len 64 if too_many_requests
    http-request deny deny_status 429 if too_many_requests
    http-request deny deny_status 429 if too_many_connections

    default_backend app_backend

backend app_backend
    balance roundrobin
    server app1 10.0.0.10:3000 check
    server app2 10.0.0.11:3000 check
```

## Per-URL Rate Limiting

Different endpoints may need different limits. An authentication endpoint needs tighter limits than a general API:

```
backend per_url_limits
    # This table tracks requests indexed by IP+path combination
    stick-table type binary len 64 size 500k expire 1m store http_req_rate(60s)

frontend smart_rate_limit
    bind *:80

    # Track general requests by IP
    http-request track-sc0 src table rate_limit_table

    # Track login attempts separately (more restrictive)
    acl is_login  path_beg /login /auth/login /api/v1/login
    http-request track-sc1 src table per_url_limits if is_login

    # General rate limit: 200 requests per 10 seconds
    acl over_general_limit sc_http_req_rate(0) gt 200
    http-request deny deny_status 429 if over_general_limit

    # Login rate limit: 10 requests per 60 seconds
    acl over_login_limit sc_http_req_rate(1) gt 10
    http-request deny deny_status 429 if is_login over_login_limit

    default_backend app_backend
```

## Blocking Abusers Based on Error Rate

Block clients generating too many errors (scraping, fuzzing, etc.):

```
backend error_tracking
    stick-table type ip size 200k expire 5m store http_err_rate(1m),http_req_rate(1m)

frontend with_error_tracking
    bind *:80

    # Track all requests
    http-request track-sc0 src table error_tracking

    # Track responses - increment error counter for 4xx/5xx responses
    acl is_client_error status 400:499
    acl is_server_error status 500:599

    # Block if more than 20 errors per minute
    acl too_many_errors sc_http_err_rate(0) gt 20

    # Also check error rate vs total request ratio
    # If error rate is more than 50% of request rate, probably a scanner
    acl high_error_ratio sc_http_err_rate(0) gt sc_http_req_rate(0)/2

    http-request deny deny_status 429 if too_many_errors
    http-request deny deny_status 403 if high_error_ratio

    default_backend app_backend
```

## Implementing IP Banning

For repeat offenders, add them to a ban list:

```
global
    # Size of the ban table
    tune.stick-counters 8

defaults
    mode http

backend ban_list
    # Binary key for flexible matching
    stick-table type ip size 100k expire 24h store gpc0

frontend with_banning
    bind *:80

    # Track with two stick counters
    http-request track-sc0 src table rate_limit_table
    http-request track-sc1 src table ban_list

    # Check if this IP is banned (gpc0 is a general purpose counter)
    acl is_banned sc1_get_gpc0 gt 0

    # Check rate limit
    acl too_fast sc_http_req_rate(0) gt 500

    # If too fast, add to ban list and deny
    http-request sc-inc-gpc0(1) if too_fast !is_banned
    http-request deny deny_status 429 if too_fast
    http-request deny deny_status 403 if is_banned

    default_backend app_backend
```

Manually add or remove IPs from the ban list:

```bash
# Add an IP to the ban list
echo "set table ban_list key 1.2.3.4 data.gpc0 1" | \
  sudo socat - /run/haproxy/admin.sock

# Remove an IP from the ban list (set gpc0 to 0)
echo "set table ban_list key 1.2.3.4 data.gpc0 0" | \
  sudo socat - /run/haproxy/admin.sock

# List all entries in the ban list
echo "show table ban_list" | sudo socat - /run/haproxy/admin.sock
```

## Rate Limiting with Custom Error Pages

Return informative responses with the Retry-After header:

```
frontend friendly_rate_limit
    bind *:80

    http-request track-sc0 src table rate_limit_table

    acl over_limit sc_http_req_rate(0) gt 100

    # Return a proper 429 with Retry-After header
    http-request return status 429 \
        hdr "Retry-After" "60" \
        hdr "Content-Type" "application/json" \
        content-type "application/json" \
        string '{"error":"rate_limited","message":"Too many requests. Please slow down.","retry_after":60}' \
        if over_limit

    default_backend app_backend
```

## Stick Table Data Types Reference

HAProxy stick tables support these counters:

```
conn_cur          - Current concurrent connections from this key
conn_rate(period) - Connection rate over the period
conn_cnt          - Total connection count
http_req_rate(p)  - HTTP request rate over period p
http_req_cnt      - Total HTTP request count
http_err_rate(p)  - HTTP error rate over period p
http_err_cnt      - Total HTTP error count
http_fail_cnt     - Total connection failure count
bytes_in_rate(p)  - Bytes received rate
bytes_out_rate(p) - Bytes sent rate
gpc0              - General purpose counter 0 (manual use)
gpc1              - General purpose counter 1 (manual use)
gpc0_rate(p)      - Rate of GPC0 increments over period p
```

## Monitoring Rate Limiting

```bash
# View all stick table entries
echo "show table rate_limit_table" | sudo socat - /run/haproxy/admin.sock

# View specific IP entry
echo "show table rate_limit_table key 1.2.3.4" | sudo socat - /run/haproxy/admin.sock

# Check current HAProxy info including stick table memory
echo "show info" | sudo socat - /run/haproxy/admin.sock | grep -i stick

# Watch rate limited requests in the log
sudo journalctl -u haproxy -f | grep "429"
```

## Full Production Configuration Example

```
global
    log /dev/log local0
    log /dev/log local1 notice
    maxconn 100000
    user haproxy
    group haproxy
    daemon

defaults
    mode http
    log global
    option httplog
    option forwardfor
    timeout connect 5s
    timeout client 60s
    timeout server 60s
    errorfile 429 /etc/haproxy/errors/429.http

# Rate limiting stick table
backend sc_be_http_req_rate
    stick-table type ip size 1m expire 10s store http_req_rate(10s),http_err_rate(60s),conn_cur

# IP blacklist table
backend sc_be_blacklist
    stick-table type ip size 100k expire 24h store gpc0

frontend main
    bind *:80
    bind *:443 ssl crt /etc/ssl/haproxy/combined.pem alpn h2,http/1.1

    # HTTP to HTTPS
    http-request redirect scheme https unless { ssl_fc }

    # Track all requests by IP
    http-request track-sc0 src table sc_be_http_req_rate
    http-request track-sc1 src table sc_be_blacklist

    # Check blacklist
    acl blacklisted sc1_get_gpc0 gt 0
    http-request deny deny_status 403 if blacklisted

    # Rate limiting ACLs
    acl rate_limited     sc_http_req_rate(0) gt 200   # 200 req/10s
    acl too_many_errors  sc_http_err_rate(0) gt 50    # 50 errors/60s
    acl too_many_conns   sc_conn_cur(0) gt 100        # 100 concurrent

    # Auto-blacklist on extreme rate
    acl extreme_rate     sc_http_req_rate(0) gt 1000

    # Add to blacklist for extreme abusers
    http-request sc-inc-gpc0(1) if extreme_rate

    # Deny with proper status codes
    http-request return status 429 hdr "Retry-After" "10" if rate_limited
    http-request deny deny_status 429 if too_many_errors
    http-request deny deny_status 429 if too_many_conns

    default_backend app_servers

backend app_servers
    balance leastconn
    option httpchk
    http-check send meth GET uri /health ver HTTP/1.1
    server app1 10.0.0.10:3000 check inter 5s
    server app2 10.0.0.11:3000 check inter 5s
```

```bash
# Test and reload
sudo haproxy -c -f /etc/haproxy/haproxy.cfg
sudo systemctl reload haproxy
```

Rate limiting in HAProxy is efficient because all the counting happens in shared memory with no disk I/O. The stick table's memory usage scales linearly with the number of unique clients, so size your tables appropriately based on your expected traffic.
