# Validation Summary: How to Configure NGINX Plus with IPv6 Active Health Checks

## Status
validated

## Post Type
Tutorial / Configuration guide

## Technologies Covered
- NGINX Plus (commercial NGINX)
- IPv6 networking
- HTTP active health checks (`ngx_http_upstream_hc_module`)
- Stream module TCP/UDP health checks (`ngx_stream_upstream_hc_module`)
- NGINX Plus REST API (`ngx_http_api_module`)
- `match` blocks for response validation
- `slow_start` upstream parameter

## Sources Consulted
- NGINX `ngx_http_upstream_hc_module` (health_check directive): https://nginx.org/en/docs/http/ngx_http_upstream_hc_module.html
- NGINX `ngx_stream_upstream_hc_module` (stream health_check): https://nginx.org/en/docs/stream/ngx_stream_upstream_hc_module.html
- NGINX `ngx_http_api_module` (REST API and dashboard): https://nginx.org/en/docs/http/ngx_http_api_module.html
- NGINX `ngx_http_status_module` (deprecated/removed): https://nginx.org/en/docs/http/ngx_http_status_module.html
- NGINX `ngx_http_upstream_module` (upstream/slow_start): https://nginx.org/en/docs/http/ngx_http_upstream_module.html

## Issues Found
1. **Deprecated `status;` directive used in HTTP server block.** The `ngx_http_status_module` was removed in NGINX 1.13.10 (replaced by `ngx_http_api_module` in 1.13.3) and is not available in any current NGINX Plus release. The original config showed:

   ```nginx
   location /nginx_status {
       status;
       ...
   }
   ```

   Replaced with the current `api` directive so the snippet works on supported NGINX Plus versions:

   ```nginx
   location /nginx_status {
       api;
       ...
   }
   ```

## Review Notes
- API version `9` (used in `/api/9/...` URLs) is correct for current NGINX Plus releases (R30+).
- `interval=10` (without unit) is accepted because NGINX time values default to seconds, but `interval=10s` (used in the stream example) is the documented explicit form. Both are valid.
- The stream `match` example for PostgreSQL (`send "SELECT 1;\n"; expect ~ "^1$"`) is illustrative only — PostgreSQL uses a binary wire protocol and would not respond to a plain-text SELECT, so this should be treated as a placeholder pattern rather than a working PostgreSQL health probe.
- The `match` block syntax (`status`, `header Field = value`, `body ~ "regex"`) is correct per NGINX docs.
- `slow_start=60s`, `keepalive`, `zone`, `max_fails`, `fail_timeout`, `backup`, and `api write=on` are all valid NGINX Plus parameters/directives.
