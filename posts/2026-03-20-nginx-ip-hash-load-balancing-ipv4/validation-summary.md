# Validation Summary: How to Configure ip_hash Load Balancing in Nginx for IPv4 Clients

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Nginx (open source) — `ngx_http_upstream_module`
- `ip_hash` load balancing directive
- `proxy_pass` and reverse proxy headers (`X-Real-IP`, `X-Forwarded-For`, `Host`, `Connection`)
- Bash (verification script using `curl` and `seq`)

## Sources Consulted
- Nginx upstream module documentation: https://nginx.org/en/docs/http/ngx_http_upstream_module.html
- Nginx `ip_hash` directive: https://nginx.org/en/docs/http/ngx_http_upstream_module.html#ip_hash
- Nginx `server` directive (including `down` and `weight` parameters): https://nginx.org/en/docs/http/ngx_http_upstream_module.html#server
- Nginx `sticky` directive (Nginx Plus only): https://nginx.org/en/docs/http/ngx_http_upstream_module.html#sticky
- Nginx `proxy_pass` and proxy_set_header documentation: https://nginx.org/en/docs/http/ngx_http_proxy_module.html

## Issues Found
No technical issues found.

The following claims were verified against official Nginx documentation and are accurate:
- `ip_hash` uses the first three octets of the IPv4 address as the hashing key (matches official docs verbatim).
- Marking a server with the `down` parameter preserves the existing hash table so other clients are not remapped (matches official guidance: "If one of the servers needs to be temporarily removed, it should be marked with the down parameter in order to preserve the current hashing of client IP addresses").
- Weights are supported with `ip_hash` (supported since Nginx 1.3.1).
- Cookie-based stickiness via the `sticky` directive is Nginx Plus only.
- The reverse-proxy header configuration (`Host`, `X-Real-IP`, `X-Forwarded-For`, `proxy_http_version 1.1`, `Connection ""`) is syntactically correct and idiomatic.
- The Bash verification snippet is syntactically valid.

## Review Notes
- Worth noting in a future revision: when Nginx itself is behind another L4/L7 proxy or load balancer, `$remote_addr` (which `ip_hash` uses) will be the upstream proxy's address, not the real client. In that scenario `ip_hash` will hash all traffic to a single backend. Users in such setups typically need the `realip` module (`set_real_ip_from` + `real_ip_header`) to recover the true client IP, or should use the `hash` directive with `$http_x_forwarded_for` instead. The post does not currently mention this caveat, but it is not technically incorrect — just incomplete.
- The "Limitations" section correctly identifies the NAT and /24-coarseness pitfalls, which are the most common operational issues with `ip_hash`.
