# Validation Summary: How to Configure Nginx as an IPv6 Reverse Proxy

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Nginx (HTTP server / reverse proxy)
- IPv6 networking (RFC 4193 ULAs, dual-stack listen sockets)
- ngx_http_core_module (`listen`, `resolver`)
- ngx_http_upstream_module (upstream blocks, passive health checks)
- ngx_http_realip_module (`set_real_ip_from`, `real_ip_header`)
- ngx_http_log_module (`log_format`, `access_log`)
- ngx_http_limit_req_module (`limit_req_zone`, `$binary_remote_addr`)
- ngx_http_geo_module
- ngx_http_geoip2_module (third-party MaxMind module)

## Sources Consulted
- Nginx core module — listen directive: https://nginx.org/en/docs/http/ngx_http_core_module.html#listen
- Nginx upstream module — server directive (max_fails, fail_timeout, IPv6 brackets): https://nginx.org/en/docs/http/ngx_http_upstream_module.html#server
- Nginx core module — resolver directive (ipv6=on default): https://nginx.org/en/docs/http/ngx_http_core_module.html#resolver
- Nginx proxy module — embedded variables ($proxy_add_x_forwarded_for): https://nginx.org/en/docs/http/ngx_http_proxy_module.html
- Nginx realip module — set_real_ip_from / real_ip_header: https://nginx.org/en/docs/http/ngx_http_realip_module.html
- Nginx core embedded variables ($binary_remote_addr — 16 bytes for IPv6): https://nginx.org/en/docs/http/ngx_http_core_module.html#variables
- RFC 4193 — Unique Local IPv6 Unicast Addresses (fc00::/7)
- ngx_http_geoip2_module — https://github.com/leev/ngx_http_geoip2_module

## Issues Found

1. **Incorrect ULA prefix in `set_real_ip_from`.** The post used `set_real_ip_from fd00::/8;` with the comment "ULA internal proxies". RFC 4193 defines ULAs as `fc00::/7`; `fd00::/8` only covers the locally-assigned half. Updated to `fc00::/7` and added an RFC reference in the comment.

2. **Inaccurate passive health check comment.** The original upstream block said "mark backend as down after 3 failed connections", but the configuration relied on Nginx defaults — and the default `max_fails` is 1 (with `fail_timeout=10s`), not 3. Added explicit `max_fails=3 fail_timeout=30s` to the `server` lines so the configuration matches the comment, and rewrote the comment to clarify the default behavior.

3. **`X-Forwarded-For` overwriting the chain.** The post used `proxy_set_header X-Forwarded-For $remote_addr;`, which overwrites any existing `X-Forwarded-For` header from upstream proxies and loses the client chain. Changed to the standard reverse-proxy idiom `$proxy_add_x_forwarded_for`, which appends `$remote_addr` to any existing chain (or just uses `$remote_addr` when none exists).

## Review Notes

- `listen [::]:80;` is IPv6-only by default in modern Nginx (since 1.3.4 `ipv6only=on` is the default), so the post's pattern of pairing `listen 80;` with `listen [::]:80;` is correct for accepting both stacks.
- `resolver [2001:db8::53] ipv6=on;` is valid but `ipv6=on` is the default since Nginx 1.5.8 — it's redundant but harmless. The meaningful toggle is `ipv6=off` (or, since 1.23.1, `ipv4=off`).
- The `geo $limit_key { default $binary_remote_addr; ... }` block in the rate-limiting section is informational — `$limit_key` is defined but never referenced by the `limit_req_zone` (which keys on `$binary_remote_addr` directly). Native `/64`-prefix grouping for IPv6 isn't supported by the `geo` module; in practice this is achieved with a `map` regex on `$remote_addr`. The post correctly notes this is a future improvement area without claiming the snippet implements it, so it was left as-is.
- In open-source Nginx, `server backend.internal:8080;` inside an upstream block resolves DNS only at startup/reload. Dynamic re-resolution requires the `resolve` parameter (commercial-only historically; available in OSS Nginx 1.27.3+ from late 2024). The post's claim that "Nginx will use AAAA if available" is accurate at resolution time.
- `$binary_remote_addr` is 16 bytes (128 bits) for IPv6 clients, so each unique IPv6 address consumes its own slot in `limit_req_zone` memory — operators on dual-stack networks may want to size the zone larger or implement /64 grouping via `map` to avoid abuse via privacy-extension address rotation.
