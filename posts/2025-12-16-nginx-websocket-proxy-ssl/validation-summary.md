# Validation Summary: How to Configure Nginx as WebSocket Proxy with SSL

## Status
validated

## Post Type
Technical tutorial / configuration guide

## Technologies Covered
- Nginx reverse proxy configuration
- WebSocket and WSS proxying
- SSL/TLS termination
- HTTP/2 configuration in Nginx
- Nginx upstream load balancing
- Socket.IO reverse proxying
- curl and websocat testing commands

## Sources Consulted
- Nginx WebSocket proxying documentation: https://nginx.org/en/docs/http/websocket.html
- Nginx core module `listen` directive documentation: https://nginx.org/r/listen
- Nginx HTTP/2 module documentation: https://nginx.org/en/docs/http/ngx_http_v2_module.html
- Nginx proxy module documentation: https://nginx.org/en/docs/http/ngx_http_proxy_module.html
- Nginx upstream module documentation: https://nginx.org/en/docs/http/ngx_http_upstream_module.html
- Nginx log module documentation: https://nginx.org/en/docs/http/ngx_http_log_module.html
- Socket.IO multiple nodes / Nginx configuration documentation: https://socket.io/docs/v4/using-multiple-nodes/
- curl man page: https://curl.se/docs/manpage.html
- websocat project metadata: https://github.com/vi/websocat

## Issues Found
- Replaced `listen 443 ssl http2;` examples with `listen 443 ssl;` plus `http2 on;` because the `http2` parameter on the `listen` directive is deprecated in current Nginx documentation.
- Changed `proxy_connect_timeout 7d;` to `proxy_connect_timeout 60s;` in production examples because Nginx documents that this timeout cannot usually exceed 75 seconds.
- Moved the `log_format` directive out of the `server` block in the debug logging example and noted that it must be defined in the `http` context, matching the Nginx log module directive context.
- Corrected the comment above `proxy_intercept_errors off;` to state that backend error responses are passed through. The directive controls error interception for `error_page` handling; it does not prevent connection closure on backend errors.

## Review Notes
The remaining WebSocket proxy configuration matches Nginx's documented requirements: explicit upgrade headers, HTTP/1.1 proxying, and increased `proxy_read_timeout` for idle WebSocket connections. The Socket.IO sticky-session guidance is technically correct when polling is enabled; Socket.IO's own documentation notes that sticky sessions are not required when HTTP long-polling is disabled and only WebSocket/WebTransport is used.
