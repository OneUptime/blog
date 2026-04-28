# Validation Summary: How to Set Up Nginx Round-Robin Load Balancing Across IPv4 Servers

## Status
validated

## Post Type
Tutorial / Configuration Guide

## Technologies Covered
- Nginx (HTTP load balancing / `ngx_http_upstream_module`)
- Nginx `ngx_http_proxy_module` (proxy_pass, proxy_set_header, proxy_next_upstream, timeouts)
- Nginx `ngx_http_stub_status_module`
- Nginx `ngx_http_log_module` (log_format, access_log)
- HTTP / IPv4 networking
- Bash / curl for verification

## Sources Consulted
- Nginx HTTP Upstream module docs: https://nginx.org/en/docs/http/ngx_http_upstream_module.html
- Nginx HTTP Proxy module docs: https://nginx.org/en/docs/http/ngx_http_proxy_module.html
- Nginx stub_status module docs: https://nginx.org/en/docs/http/ngx_http_stub_status_module.html
- Nginx Log module docs: https://nginx.org/en/docs/http/ngx_http_log_module.html
- Nginx HTTP Load Balancing guide: https://docs.nginx.com/nginx/admin-guide/load-balancer/http-load-balancer/

## Issues Found
No technical issues found.

## Review Notes
- Round-robin is correctly described as Nginx's default load balancing algorithm; no explicit directive is required (unlike `least_conn`, `ip_hash`, `random`, or `hash`).
- The `upstream` block syntax, including hyphenated names like `backend-pool`, is valid in Nginx.
- Passive health-check parameters `max_fails` and `fail_timeout` are correctly applied per-server.
- `proxy_next_upstream` values used (`error`, `timeout`, `http_500`, `http_502`, `http_503`) are all valid; `proxy_next_upstream_tries` and `proxy_next_upstream_timeout` are correctly used (both require Nginx 1.7.5+, which is the case for any currently supported version).
- `$upstream_addr` is the correct variable for logging which backend served the request.
- `stub_status` directive and access control with `allow`/`deny` are correctly configured; the module is built into open source Nginx by default since 1.7.5 (and is part of the core build for most distributions).
- The `log_format` string contains a Unicode arrow (`→`) — this is allowed in Nginx (format strings are not restricted to ASCII) and works fine, though some operators prefer ASCII-only logs to simplify downstream parsing. Not a correctness issue.
- Minor caveat (not an error): the verification example assumes each backend already returns a `server-id` header or body marker; the post explicitly notes this prerequisite ("Each backend should add a response header or body identifying itself").
