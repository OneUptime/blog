# How to Configure HAProxy ACL Rules Based on Client IPv4 Addresses

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: HAProxy, ACL, IPv4, Access Control, Security, Routing

Description: Use HAProxy ACL rules to allow, deny, and route traffic based on client IPv4 addresses and subnets, implementing network-level access control at the load balancer.

## Introduction

HAProxy's Access Control Lists (ACLs) evaluate conditions on incoming connections and requests. Using `src` (source IP) based ACLs, you can restrict access, route traffic to different backends, or apply different policies based on the client's IPv4 address.

## Basic IP-Based ACLs

```haproxy
# /etc/haproxy/haproxy.cfg

frontend http_in
    bind 203.0.113.10:80
    mode http

    # Define ACLs based on source IP
    acl is_internal     src 10.0.0.0/8
    acl is_office       src 203.0.113.64/26
    acl is_partner      src 198.51.100.10 198.51.100.11 198.51.100.12
    acl is_blocked      src 192.0.2.0/24

    # Reject blocked IPs immediately
    tcp-request connection reject if is_blocked

    # Route to different backends based on IP
    use_backend internal_backend if is_internal
    use_backend partner_backend  if is_partner
    default_backend public_backend
```

## Restricting Admin Access by IP

```haproxy
frontend http_in
    bind 203.0.113.10:80
    mode http

    # Admin path: only accessible from trusted IPs
    acl is_admin_path   path_beg /admin/
    acl is_trusted_ip   src 10.0.0.0/8 192.168.0.0/16 203.0.113.64/26

    # Reject admin requests from untrusted IPs
    http-request deny status 403 if is_admin_path !is_trusted_ip

    default_backend app_servers
```

## TCP-Level Connection Rejection

For TCP mode, reject connections at the TCP connection stage before traffic is forwarded to the backend:

```haproxy
frontend db_frontend
    bind 203.0.113.10:5432
    mode tcp

    acl is_allowed_client src 10.0.0.0/8 192.168.0.0/16

    # Reject at TCP level (more efficient than HTTP-level deny)
    tcp-request connection reject if !is_allowed_client

    default_backend postgres_servers
```

## Multiple Conditions (AND/OR Logic)

```haproxy
frontend http_in
    bind 203.0.113.10:80
    mode http

    acl is_internal     src 10.0.0.0/8
    acl is_api_path     path_beg /api/
    acl is_v2_path      path_beg /api/v2/
    acl is_partner      src 198.51.100.0/24

    # Allow API access only from internal OR partner networks
    http-request deny if is_api_path !is_internal !is_partner

    # Partner networks may access only /api/v2/
    http-request deny if is_api_path !is_v2_path is_partner

    # Allow internal access to all API versions
    use_backend api_v2_backend  if is_v2_path is_internal
    use_backend api_v2_backend  if is_v2_path is_partner
    use_backend api_v1_backend  if is_api_path is_internal
    default_backend web_backend
```

## Rate Limiting by IPv4 with ACLs

```haproxy
frontend http_in
    bind 203.0.113.10:80
    mode http

    # Stick table: track request rate per source IP
    stick-table type ip size 100k expire 60s store http_req_rate(10s)

    # Update counter for each request
    http-request track-sc0 src

    # Define ACL: more than 50 requests per 10 seconds
    acl is_rate_limited  sc_http_req_rate(0) gt 50
    acl is_trusted       src 10.0.0.0/8

    # Rate limit only untrusted clients
    http-request deny status 429 if is_rate_limited !is_trusted

    default_backend app_servers
```

## Logging ACL Decisions

```haproxy
frontend http_in
    bind 203.0.113.10:80
    mode http

    acl is_internal src 10.0.0.0/8

    # Capture client IPv4 for logging
    http-request capture src len 15

    # Mark which ACL matched using custom headers (backend sees this)
    http-request set-header X-Client-Type internal if is_internal
    http-request set-header X-Client-Type external if !is_internal

    default_backend app_servers
```

## Testing ACL Rules

```bash
# Test from allowed IP

curl -4 --interface 10.0.0.5 http://203.0.113.10/admin/

# Test from blocked IP (should get 403 or connection rejected)
curl -4 --interface 192.0.2.100 http://203.0.113.10/admin/

# View HAProxy stats and inspect the dreq, dcon, and dses counters
echo "show stat" | sudo socat stdio /run/haproxy/admin.sock | grep -E '(^#|^http_in,)'

# Validate config before reload
sudo haproxy -c -f /etc/haproxy/haproxy.cfg
```

## Conclusion

HAProxy ACLs provide powerful IPv4-based traffic control. Use `src` ACLs for IP matching, `tcp-request connection reject` for efficient TCP-level blocking, and `http-request deny` for HTTP-level access control. Combine with `stick-table` for per-IP rate limiting and `use_backend` for routing decisions. Always validate config with `haproxy -c` before reloading.
