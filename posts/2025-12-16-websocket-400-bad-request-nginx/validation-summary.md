# Validation Summary: How to Fix WebSocket 400 Bad Request with Nginx

## Status
validated

## Post Type
Tutorial / Troubleshooting guide

## Technologies Covered
- Nginx reverse proxy configuration
- WebSocket HTTP upgrade handshake
- Socket.IO reverse proxy behavior
- TLS / HTTP/2 Nginx server configuration
- curl and wscat command-line testing

## Sources Consulted
- NGINX WebSocket proxying documentation: https://nginx.org/en/docs/http/websocket.html
- NGINX proxy module documentation: https://nginx.org/en/docs/http/ngx_http_proxy_module.html
- NGINX upstream module documentation: https://nginx.org/en/docs/http/ngx_http_upstream_module.html
- NGINX map module documentation: https://nginx.org/en/docs/http/ngx_http_map_module.html
- NGINX HTTP/2 module documentation: https://nginx.org/en/docs/http/ngx_http_v2_module.html
- NGINX changelog for HTTP/2 listen parameter deprecation: https://nginx.org/en/CHANGES
- RFC 6455, The WebSocket Protocol: https://datatracker.ietf.org/doc/html/rfc6455
- Socket.IO reverse proxy documentation: https://socket.io/docs/v4/reverse-proxy/
- Local curl help output for `-i` and `-N` flags.

## Issues Found
- The post stated that `proxy_http_version` defaults to `1.0` without qualification. Current NGINX documentation says `1.1` is the default since NGINX 1.29.7, while older versions defaulted to `1.0`. Updated the wording to make the claim version-specific while keeping the explicit `proxy_http_version 1.1` examples for compatibility.
- The production SSL example used `listen 443 ssl http2;`, but NGINX 1.25.1 deprecated the `http2` parameter on `listen`. Changed it to `listen 443 ssl;` with `http2 on;`.
- The keepalive section implied that upstream keepalive itself breaks WebSocket proxying. The actual problem in the shown snippet was clearing the `Connection` header in the WebSocket location. Renamed and adjusted the section so it identifies the incorrect header handling.
- The `map` examples did not explicitly say that `map` belongs in the `http` context. Added comments before the snippets to prevent users from placing it inside a `server` or `location` block.
- The buffering section claimed large WebSocket messages get stuck in proxy buffers. Since NGINX tunnels upgraded WebSocket connections, this is more accurate for HTTP fallback or streaming responses. Updated the problem statement accordingly.

## Review Notes
The remaining examples are technically valid and align with the official NGINX WebSocket guidance: explicitly forward `Upgrade` and `Connection`, use an HTTP version that supports upgrade semantics, and increase read timeouts for long-lived connections. `proxy_http_version 1.1` is redundant on NGINX 1.29.7 and newer but remains harmless and useful for older deployments.
