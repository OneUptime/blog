# Validation Summary: How to Configure HTTP/2 in Nginx

## Status
validated

## Post Type
Tutorial / Configuration guide

## Technologies Covered
- Nginx
- HTTP/2
- TLS / SSL
- ALPN
- OpenSSL
- curl
- nghttp
- Flask response headers
- gRPC proxying

## Sources Consulted
- Nginx ngx_http_v2_module documentation: https://nginx.org/en/docs/http/ngx_http_v2_module.html
- Nginx ngx_http_core_module documentation: https://nginx.org/en/docs/http/ngx_http_core_module.html
- Nginx ngx_http_proxy_module documentation: https://nginx.org/en/docs/http/ngx_http_proxy_module.html
- Nginx ngx_http_grpc_module documentation: https://nginx.org/en/docs/http/ngx_http_grpc_module.html
- Nginx change log: https://nginx.org/en/CHANGES
- curl man page: https://curl.se/docs/manpage.html

## Issues Found
- The post used `listen 443 ssl http2;`, which is deprecated in Nginx 1.25.1 and newer. Changed examples to `listen 443 ssl;` plus `http2 on;`.
- The post described and configured HTTP/2 server push with `http2_push` and `http2_push_preload`, but Nginx removed HTTP/2 server push support in 1.25.1. Replaced these examples with preload Link headers and Early Hints guidance.
- The post listed server push as an HTTP/2 benefit and referenced it in the diagram, performance table, checklist, description, and conclusion. Updated those references to supported alternatives or removed the server-push claim.
- The post used obsolete tuning directives `http2_idle_timeout` and `http2_max_requests`. Replaced them with `keepalive_timeout` and `keepalive_requests`, as recommended by current Nginx documentation.
- The post stated that HTTP/2 in Nginx requires SSL/TLS. Clarified that browser HTTP/2 uses HTTPS, while HTTP/2 can also run without TLS as h2c.
- The ALPN section said HTTP/2 uses ALPN to "upgrade" connections. Changed this to protocol negotiation during the TLS handshake.
- The backend section implied HTTP/1.1 was required for upstream keepalive. Updated the wording for current Nginx, which now supports proxying with HTTP/1.1 by default and can proxy HTTP/2 to backends in newer versions.
- The migration checklist gave an inaccurate version note by tying Nginx 1.25.1 to HTTP/3. Changed it to explain when the current `http2 on;` syntax applies and when the older syntax is needed.

## Review Notes
The final examples are aligned with current Nginx documentation, but Nginx syntax could not be locally tested because the `nginx` binary is not installed in this environment.
