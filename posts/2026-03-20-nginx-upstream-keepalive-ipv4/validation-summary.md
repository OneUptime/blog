# Validation Summary: How to Configure Nginx Upstream Keepalive Connections for IPv4 Backends

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Nginx (HTTP upstream module, stub_status module)
- HTTP/1.1 keepalive semantics
- IPv4 backend networking
- Linux `ss` (iproute2) socket statistics utility
- `watch` and `curl` CLI utilities

## Sources Consulted
- Official Nginx upstream module documentation: https://nginx.org/en/docs/http/ngx_http_upstream_module.html (covers `keepalive`, `keepalive_requests`, `keepalive_timeout`)
- Official Nginx proxy module documentation: https://nginx.org/en/docs/http/ngx_http_proxy_module.html (covers `proxy_http_version`, `proxy_set_header`)
- Official Nginx stub_status module documentation: https://nginx.org/en/docs/http/ngx_http_stub_status_module.html
- iproute2 `ss(8)` man page (for `ss -tn dst` filter syntax)

## Issues Found
No technical issues found.

Verified key facts:
- `keepalive` directive introduced in Nginx 1.1.4 — matches the post's prerequisite of "Nginx 1.1.4+".
- `keepalive_requests` was introduced in Nginx 1.15.3 with a default that became 1000 in 1.19.10 (was 100 prior). The post's table value of 1000 and version note of "Nginx 1.15.3+" are both correct.
- `keepalive_timeout` was introduced in Nginx 1.15.3 with a default of 60s — matches the post.
- HTTP/1.1 requirement and the need for `proxy_http_version 1.1` plus `proxy_set_header Connection ""` are accurate (Nginx defaults `proxy_http_version` to 1.0).
- The `ss -tn dst <addr>:<port>` syntax is valid; output column layout matches modern iproute2 versions.
- The `stub_status` output format (`Active connections`, `server accepts handled requests`, `Reading/Writing/Waiting`) is accurate.
- The mermaid sequence diagram correctly depicts TCP connection reuse semantics.

## Review Notes
- The "Default" of 1000 shown for `keepalive_requests` is correct only on Nginx 1.19.10+; older versions defaulted to 100. The author's inline comment ("Nginx 1.15.3+") refers to directive availability rather than the default value, which is accurate as written.
- As of Nginx 1.29.7 (released after this post), upstream keepalive is enabled by default at 32 connections per worker, and a new `local` parameter is available to prevent cross-location sharing. Not an error, but a possible future-proofing note.
- The "rule of thumb" formula `(worker_connections / upstream_servers) * 0.5` is the author's heuristic, not an official Nginx recommendation — left as-is since it's clearly framed as guidance.
