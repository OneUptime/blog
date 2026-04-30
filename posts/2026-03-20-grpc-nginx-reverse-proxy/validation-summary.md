# Validation Summary: How to Configure gRPC with Nginx as an IPv4 Reverse Proxy

## Status
validated

## Post Type
Guide

## Technologies Covered
- Nginx
- gRPC
- HTTP/2
- TLS and mTLS
- IPv4 networking

## Sources Consulted
- Nginx `ngx_http_grpc_module`: https://nginx.org/en/docs/http/ngx_http_grpc_module.html
- Nginx `ngx_http_v2_module`: https://nginx.org/en/docs/http/ngx_http_v2_module.html
- Nginx `ngx_http_upstream_module`: https://nginx.org/en/docs/http/ngx_http_upstream_module.html
- Nginx `ngx_http_ssl_module`: https://nginx.org/en/docs/http/ngx_http_ssl_module.html
- NGINX Community Blog, "Introducing gRPC Support with NGINX 1.13.10": https://blog.nginx.org/blog/nginx-1-13-10-grpc
- gRPC Status Codes: https://grpc.io/docs/guides/status-codes/
- gRPC over HTTP/2 protocol reference: https://grpc.github.io/grpc/core/md_doc__p_r_o_t_o_c_o_l-_h_t_t_p2.html

## Issues Found
- Replaced deprecated `listen ... http2` syntax with `http2 on;`, which is the current Nginx configuration style since the dedicated `http2` directive was introduced and the `listen` parameter was deprecated.
- Fixed the basic plain-text proxy example so Nginx no longer listens on the same local socket it proxies to. The original example listened on `50051` while also proxying to `127.0.0.1:50051`, which would be invalid or self-referential on a single host.
- Added the missing `upstream grpc_backend` block to the mTLS example so the snippet is complete and syntactically usable on its own.
- Corrected the forwarded client-identity header in the mTLS example from `X-Client-CN` to `X-Client-Subject-DN` because `$ssl_client_s_dn` exposes the full subject DN, not just the certificate common name.
- Corrected wording in the description and conclusion to describe HTTP/2 proxying and upstream error handling instead of HTTP/2 passthrough and health checks, which the post did not actually configure.

## Review Notes
- Explicit upstream `keepalive` directives remain valid, but in Nginx 1.29.7 and later upstream keepalive caching is enabled by default with a default limit of 32 idle connections per worker.
- The `error_page` pattern returning gRPC status `14` matches NGINX’s documented gRPC proxy examples for surfacing upstream failures as `UNAVAILABLE`.
