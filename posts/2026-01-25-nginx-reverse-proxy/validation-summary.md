# Validation Summary: How to Configure Nginx as a Reverse Proxy

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Nginx HTTP reverse proxy configuration
- Nginx upstream load balancing
- TLS/SSL termination
- HTTP proxy headers
- WebSocket proxying
- Nginx buffering and timeout directives
- Nginx CLI commands

## Sources Consulted
- Nginx `ngx_http_proxy_module` documentation: https://nginx.org/en/docs/http/ngx_http_proxy_module.html
- Nginx `ngx_http_upstream_module` documentation: https://nginx.org/en/docs/http/ngx_http_upstream_module.html
- Nginx WebSocket proxying documentation: https://nginx.org/en/docs/http/websocket.html
- Nginx `ngx_http_v2_module` documentation: https://nginx.org/en/docs/http/ngx_http_v2_module.html
- Nginx `ngx_http_core_module` `listen` directive documentation: https://nginx.org/en/docs/http/ngx_http_core_module.html#listen

## Issues Found
- The production HTTPS server used `listen 443 ssl http2;`. Nginx documentation marks the `http2` parameter on the `listen` directive as deprecated and recommends the separate `http2` directive. Changed it to `listen 443 ssl;` with `http2 on;`.
- The debugging command `sudo nginx -V 2>&1 | grep -o with-http_stub_status_module` was described as viewing upstream connection status. `nginx -V` prints build and configure options, so this command only checks whether the stub status module is available. Updated the comment to match what the command actually does.

## Review Notes
The remaining proxy, upstream, timeout, buffering, header, alias, and WebSocket examples align with the current Nginx documentation. Nginx was not installed in the local environment, so configuration syntax was reviewed against official documentation rather than validated with `nginx -t`.
