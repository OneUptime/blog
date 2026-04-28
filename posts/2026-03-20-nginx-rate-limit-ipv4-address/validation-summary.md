# Validation Summary: How to Rate Limit Requests by IPv4 Address in Nginx

## Status
validated

## Post Type
Tutorial / How-to guide

## Technologies Covered
- Nginx (`ngx_http_limit_req_module`, `ngx_http_limit_conn_module`, `ngx_http_geo_module`, `ngx_http_map_module`)
- HTTP status codes (429 Too Many Requests, 503 Service Unavailable)
- Apache Bench (`ab`) load-testing tool
- RFC 6585

## Sources Consulted
- Nginx `ngx_http_limit_req_module` documentation: https://nginx.org/en/docs/http/ngx_http_limit_req_module.html
- Nginx `ngx_http_limit_conn_module` documentation: https://nginx.org/en/docs/http/ngx_http_limit_conn_module.html
- Nginx `ngx_http_geo_module` documentation: https://nginx.org/en/docs/http/ngx_http_geo_module.html
- Nginx official blog: "Rate Limiting with NGINX and NGINX Plus" — https://blog.nginx.org/blog/rate-limiting-nginx
- RFC 6585, Section 4: https://datatracker.ietf.org/doc/html/rfc6585#section-4

## Issues Found

1. **Incorrect `geo` block in the whitelisting section.** The original snippet used `default $binary_remote_addr;` inside a `geo` block. The Nginx `geo` directive only accepts literal string values for address-to-value mappings — variables on the value side are not expanded at runtime. The pattern as written would have stored the literal string `$binary_remote_addr` for every external client, breaking the rate-limit key. Replaced with the standard, documented `geo` + `map` pattern from the official Nginx rate-limiting blog post: `geo` flags a request as 0 (trusted) or 1 (external), and a `map` translates the flag into either an empty string (disables the limit) or `$binary_remote_addr` (per-IP limit).

2. **Contradictory comment on the login endpoint snippet.** The comment read `# Login endpoint: 1 req/s, no burst tolerance`, but the directive immediately below set `burst=5`. Updated the comment to `# Login endpoint: 1 req/s, small burst queued (delayed)` so it accurately reflects that bursts are allowed and (without `nodelay`) processed at the configured rate.

## Review Notes

- All other directives were verified against the official Nginx documentation:
  - `limit_req_zone`, `limit_req`, `limit_req_status` (valid range 400–599; 429 is fine), and `limit_req_log_level` (allowed levels: `info | notice | warn | error`) — correct.
  - `limit_conn_zone`, `limit_conn`, `limit_conn_status` — correct.
  - `$limit_req_status` variable — correct; available since Nginx 1.17.6 (PASSED, DELAYED, REJECTED, DELAYED_DRY_RUN, REJECTED_DRY_RUN).
  - Empty-key behaviour for `limit_req_zone` ("Requests with an empty key value are not accounted") — correctly described.
  - RFC 6585 reference for HTTP 429 — correct.
- The `proxy_pass http://api_backend;` examples reference upstreams that are not defined in the snippets. This is acceptable for focused configuration excerpts but readers should know they need to define `upstream` blocks separately.
- The `nodelay` vs. delayed-burst distinction is correctly applied: API endpoints use `nodelay` (immediate processing of the burst), while the login endpoint omits `nodelay` (queued/delayed processing) — appropriate for slowing brute-force attempts.
