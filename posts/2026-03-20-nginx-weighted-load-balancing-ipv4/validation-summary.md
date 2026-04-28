# Validation Summary: How to Set Up Weighted Load Balancing in Nginx with IPv4 Upstreams

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Nginx (open-source) - upstream module, weighted round-robin load balancing
- Nginx Plus - dynamic configuration REST API (version 9)
- Bash / curl (verification scripting)
- Mermaid (diagram)

## Sources Consulted
- Nginx `ngx_http_upstream_module` documentation: https://nginx.org/en/docs/http/ngx_http_upstream_module.html (verified `server` directive parameters: `weight`, `max_fails`, `fail_timeout`)
- Nginx Plus Admin Guide - Dynamic Configuration of Upstreams with the NGINX Plus API: https://docs.nginx.com/nginx/admin-guide/load-balancer/dynamic-configuration-api/ (verified PATCH endpoint format `/api/9/http/upstreams/{name}/servers/{id}` and JSON body)
- Nginx `ngx_http_log_module` (log_format directive and `$upstream_addr` variable)
- Nginx `ngx_http_proxy_module` (proxy_pass, proxy_set_header, proxy_http_version)

## Issues Found
No technical issues found.

Verifications performed:
- `weight=N` directive syntax in `server` lines is correct; default weight is 1.
- The conceptual explanation that `weight=N` behaves like N entries in the round-robin pool matches Nginx's weighted round-robin implementation.
- Traffic-share math is consistent: 5/3/2 weights produce 50%/30%/20%; canary (95+95 stable vs 10 canary = 200 total) yields ~5% canary share.
- `max_fails` and `fail_timeout` parameters are valid `server` parameters and combine correctly with `weight`.
- `proxy_pass`, `proxy_set_header`, `proxy_http_version 1.1`, and `proxy_set_header Connection ""` are all valid and used correctly.
- Nginx Plus API endpoint `PATCH /api/9/http/upstreams/{name}/servers/{id}` with JSON body `{"weight": N}` matches official documentation.
- The statement that open-source Nginx requires `nginx -s reload` to apply weight changes is correct (dynamic reconfiguration of upstreams without reload is a Nginx Plus feature; OSS users can use third-party modules like `nginx-upsync-module` or the `ngx_http_dyups_module`, but the unqualified statement is accurate for vanilla open-source Nginx).
- `$upstream_addr` is a valid variable provided by the upstream module for use in log formats.
- The bash verification snippet (`for i in $(seq 1 100); do curl -s ... ; done | sort | uniq -c | sort -rn`) is syntactically valid and produces the described frequency-sorted output.

## Review Notes
- The `weight=10` value in the canary example is fine but readers might find smaller integers more intuitive (e.g., `weight=19`/`weight=19`/`weight=2` produces the same ~5% split). This is a stylistic point, not a technical error.
- The `log_format` snippet defines the format but does not show the matching `access_log` directive that would activate it. This is acceptable for a focused snippet but worth noting for readers copying the example verbatim.
- API version 9 is current as of recent Nginx Plus releases (R30+). If a future major API version is released, the example URL would need updating, but the current value is correct.
- `proxy_http_version 1.1;` and `proxy_set_header Connection "";` are commonly paired with a `keepalive` directive in the upstream block to enable connection reuse; the post does not include `keepalive`, so the keepalive setup is incomplete-but-harmless. Not a correctness issue for the topic at hand.
