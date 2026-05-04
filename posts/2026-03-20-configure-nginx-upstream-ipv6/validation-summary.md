# Validation Summary: How to Configure Nginx Upstream Servers with IPv6 Addresses

## Status
validated

## Post Type
Tutorial / Reference Guide

## Technologies Covered
- Nginx (HTTP and upstream modules)
- IPv6 networking
- Load balancing (round-robin, weighted, least_conn, ip_hash)
- TLS/SSL upstream proxying
- DNS resolution with nginx resolver directive
- Linux networking utilities (ss)

## Sources Consulted
- Nginx ngx_http_upstream_module documentation: https://nginx.org/en/docs/http/ngx_http_upstream_module.html
- Nginx ngx_http_proxy_module documentation: https://nginx.org/en/docs/http/ngx_http_proxy_module.html
- Nginx ngx_http_core_module (listen directive): https://nginx.org/en/docs/http/ngx_http_core_module.html#listen
- Nginx CHANGES log for version-specific directive availability (keepalive_requests/keepalive_timeout in upstream context added in 1.15.3)
- RFC 3986 (URI syntax for bracketed IPv6 in `host:port` notation)
- Google Public DNS IPv6 addresses documentation

## Issues Found
No technical issues found.

All examples were verified against official nginx documentation:
- IPv6 addresses correctly wrapped in `[...]` brackets when followed by `:port` in `server` and `listen` directives.
- `ipv6only=on` is a valid `listen` parameter (default is `on` since nginx 1.3.4, but explicit declaration is harmless).
- Upstream `server` directive parameters (`weight`, `max_fails`, `fail_timeout`, `backup`) are all correct.
- `keepalive`, `keepalive_requests`, and `keepalive_timeout` are valid in upstream context (the latter two were added in nginx 1.15.3, which is now widely available).
- Load balancing methods (`least_conn`, `ip_hash`, default round-robin) are accurate.
- `proxy_ssl_verify` and `proxy_ssl_trusted_certificate` directives are correctly used.
- Using a variable in `proxy_pass` correctly triggers runtime DNS resolution via the configured resolver — this is well-documented nginx behavior.
- The Google Public DNS IPv6 resolver address `2001:4860:4860::8888` is correct.
- CLI commands (`nginx -t`, `nginx -T`, `ss -tn`) are valid and use correct flags.

## Review Notes
- The post uses RFC 3849 documentation prefix `2001:db8::/32` for example addresses, which is correct best practice.
- The `keepalive_requests` and `keepalive_timeout` directives in upstream context require nginx ≥ 1.15.3. Most modern installations have this, but readers running older LTS distros (e.g., very old Ubuntu/Debian releases) might want to verify their nginx version.
- The dynamic upstream example using a variable in `proxy_pass` will pass the request URI through; for advanced URI rewriting cases, readers may want to additionally use `$request_uri` explicitly, but the example as written works correctly for the common pass-through case.
- Active health checks (beyond passive `max_fails`/`fail_timeout`) require nginx Plus; the post correctly distinguishes this in the verification section.
