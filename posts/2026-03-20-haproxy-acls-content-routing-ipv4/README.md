# How to Use HAProxy ACLs for Content-Based Routing on IPv4

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: HAProxy, ACL, Content Routing, IPv4, Load Balancing, HTTP, Configuration

Description: Learn how to use HAProxy ACLs to route HTTP requests to different backends based on URL path, hostname, header values, and client IPv4 address.

---

HAProxy ACLs (Access Control Lists) are powerful conditions that inspect request attributes - host headers, URL paths, source IPs, and more - to make intelligent routing decisions. They enable a single HAProxy frontend to fan out to multiple backend pools.

## ACL Syntax

```text
acl <name> <criterion> [flags] [operator] <value> ...
use_backend <backend> { if | unless } <condition>
```

## Routing by URL Path

Direct traffic to different backends based on the URL path prefix.

```haproxy
frontend http_in
    bind 0.0.0.0:80
    mode http

    # ACL: requests where the path starts with /api/
    acl is_api path_beg /api/

    # ACL: requests where the path starts with /static/
    acl is_static path_beg /static/

    # Route matching requests to the appropriate backend
    use_backend api_servers  if is_api
    use_backend cdn_servers  if is_static
    default_backend web_servers
```

## Routing by Hostname

```haproxy
frontend http_in
    bind 0.0.0.0:80
    mode http

    acl host_app   hdr(host) -i app.example.com
    acl host_admin hdr(host) -i admin.example.com

    use_backend app_servers   if host_app
    use_backend admin_servers if host_admin
    default_backend default_servers
```

## Routing by Client IPv4 Address

Allow internal IPv4 ranges to access admin routes while blocking external clients.

```haproxy
frontend http_in
    bind 0.0.0.0:80
    mode http

    # ACL: client source IP is in the internal RFC-1918 range
    acl internal_client src 10.0.0.0/8 192.168.0.0/16 172.16.0.0/12

    # ACL: request path is the admin panel
    acl is_admin path_beg /admin/

    # Block admin access from external IPs
    http-request deny if is_admin !internal_client

    use_backend admin_servers if is_admin internal_client
    default_backend web_servers
```

## Combining Multiple ACLs

```haproxy
frontend http_in
    bind 0.0.0.0:80
    mode http

    acl is_post  method POST
    acl is_api   path_beg /api/
    acl is_heavy req.hdr_val(Content-Length) gt 10000000  # Content-Length > 10 MB

    # Route large POST requests to a dedicated heavy backend
    use_backend heavy_backend if is_api is_post is_heavy

    # Route normal API POST requests
    use_backend api_write_backend if is_api is_post

    # Route API reads
    use_backend api_read_backend if is_api

    default_backend web_servers
```

## Routing Based on Custom HTTP Header

```haproxy
frontend http_in
    bind 0.0.0.0:80
    mode http

    # Route requests with X-Version: v2 to the new backend
    acl is_v2 req.hdr(X-Version) -m str v2
    use_backend v2_servers if is_v2
    default_backend v1_servers
```

## Key Takeaways

- `use_backend` rules are evaluated in declaration order; the first matching rule wins.
- Use `!` to negate an ACL condition (e.g., `!internal_client`).
- Combine ACLs with `if acl1 acl2` for AND logic; use `||` (or `or`) for OR.
- `http-request deny` can reject traffic without forwarding it to any backend.
