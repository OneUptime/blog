# Validation Summary: How to Configure Upstream Servers in Nginx

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Nginx HTTP upstream module
- Nginx reverse proxy configuration
- Nginx load balancing methods
- Nginx upstream keepalive connections
- Nginx DNS resolver and dynamic upstream resolution
- Nginx WebSocket proxying
- Nginx stub status module

## Sources Consulted
- Nginx ngx_http_upstream_module documentation: https://nginx.org/en/docs/http/ngx_http_upstream_module.html
- Nginx ngx_http_proxy_module documentation: https://nginx.org/en/docs/http/ngx_http_proxy_module.html
- Nginx WebSocket proxying documentation: https://nginx.org/en/docs/http/websocket.html
- Nginx ngx_http_stub_status_module documentation: https://nginx.org/en/docs/http/ngx_http_stub_status_module.html
- Nginx ngx_http_v2_module documentation: https://nginx.org/en/docs/http/ngx_http_v2_module.html
- NGINX HTTP Load Balancing admin guide: https://docs.nginx.com/nginx/admin-guide/load-balancer/http-load-balancer/

## Issues Found
- The `down` server example described the server as "temporarily disabled", but Nginx documents `down` as marking a server permanently unavailable. Changed the comment to "Server marked unavailable."
- The dynamic upstream DNS example used `server ... resolve` without a shared memory `zone`. Current Nginx documentation requires a shared memory zone for upstream server groups that use `resolve`. Added `zone backend 64k;`.
- The dynamic upstream DNS section did not mention version availability for open source Nginx. Added a note that upstream `resolve` requires Nginx Open Source 1.27.3 or later, and earlier versions require Nginx Plus.
- The monitoring section said `stub_status` checks upstream server status, but the official module exposes basic Nginx status data, not per-upstream pool health. Changed the wording to "Check basic Nginx status" and renamed the sample location to `/basic_status`.
- The `stub_status` example used the legacy `stub_status on;` syntax. Updated it to the current documented `stub_status;` syntax.
- The complete production configuration used the deprecated `listen 443 ssl http2;` form. Updated it to the current `listen 443 ssl;` plus `http2 on;` form documented for the HTTP/2 module.

## Review Notes
The remaining examples are broadly consistent with current official Nginx documentation. `slow_start` and `queue` are correctly identified as Nginx Plus-only features. Per-upstream live activity and active health checks require Nginx Plus or separate tooling; the post now avoids implying that open source `stub_status` provides upstream pool health.
