# Validation Summary: How to Configure Nginx Upstream for IPv4 Load Balancing

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Nginx (HTTP reverse proxy / load balancer)
- `ngx_http_upstream_module`
- `ngx_http_proxy_module` (proxy_pass, proxy_set_header, proxy_http_version)
- `ngx_http_stub_status_module`

## Sources Consulted
- Nginx official documentation, `ngx_http_upstream_module`: https://nginx.org/en/docs/http/ngx_http_upstream_module.html
- Nginx official documentation, `ngx_http_proxy_module`: https://nginx.org/en/docs/http/ngx_http_proxy_module.html
- Nginx blog, "HTTP Keepalive Connections and Web Performance": https://www.nginx.com/blog/http-keepalives-and-web-performance/
- Nginx changelog (1.11.5 release notes for `max_conns` in OSS)
- Nginx CLI reference (`nginx -t`, `nginx -s reload`): https://nginx.org/en/docs/switches.html

## Issues Found
- **`max_conns` availability misstated.** The original text said `max_conns` was "Nginx Plus or OpenResty feature for Nginx OSS with specific modules". Per the official upstream module docs, `max_conns=number` has been available in mainline OSS Nginx since version 1.11.5 (released October 2016). I updated the sentence to: "`max_conns` limits the number of simultaneous active connections to each backend (available in Nginx OSS since version 1.11.5)."

## Review Notes
- Default load-balancing method, supported algorithms (round robin / weighted / `ip_hash` / `least_conn` / `random`), and `upstream`/`server` syntax are all correct.
- Keepalive guidance is accurate: `keepalive N` sets the per-worker idle connection cache size, and `proxy_http_version 1.1` plus `proxy_set_header Connection ""` are required for keepalive to backends.
- `weight`, `max_fails`, `fail_timeout`, and `backup` server parameters and their semantics match the upstream module reference.
- The "View upstream status" example uses the `stub_status` module location (`/nginx_status`). Note that `stub_status` returns server-wide connection counters, not per-upstream status; per-upstream metrics require the Nginx Plus API or third-party modules (e.g., `nginx-module-vts`). The post's wording ("requires Nginx status module") is loose but not technically incorrect, so left as-is.
- All commands (`nginx -t`, `nginx -s reload`, `curl`, `for i in $(seq 1 6)`) are syntactically valid.
