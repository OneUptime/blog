# Validation Summary: How to Proxy WebSocket Connections with Nginx

## Status
validated

## Post Type
Tutorial / configuration guide

## Technologies Covered
- Nginx reverse proxy configuration
- WebSocket / WSS
- HTTP/1.1 protocol upgrade
- Socket.IO
- Nginx upstream load balancing
- Command-line debugging with curl, websocat, tail, and tcpdump

## Sources Consulted
- Nginx WebSocket proxying documentation: https://nginx.org/en/docs/http/websocket.html
- Nginx proxy module documentation: https://nginx.org/en/docs/http/ngx_http_proxy_module.html
- Nginx changelog for HTTP/2 directive deprecation in 1.25.1: https://nginx.org/en/CHANGES
- WebSocket Protocol RFC 6455: https://datatracker.ietf.org/doc/html/rfc6455
- Socket.IO 4.x multiple nodes documentation: https://socket.io/docs/v4/using-multiple-nodes/
- Socket.IO 4.x transport documentation: https://socket.io/docs/v4/how-it-works/

## Issues Found
- The SSL examples used `listen 443 ssl http2;`, which Nginx deprecated in 1.25.1. Updated both examples to `listen 443 ssl;` with `http2 on;`.
- The Socket.IO example proxied both HTTP long-polling and WebSocket traffic but always sent `Connection: upgrade`. Added a `map $http_upgrade $connection_upgrade` block and changed the Socket.IO location to use `proxy_set_header Connection $connection_upgrade;`.
- The load-balancing section implied sticky sessions are required for all WebSocket load balancing. Adjusted the wording to specify the case where WebSocket connections share backend session state with related HTTP requests.

## Review Notes
The core WebSocket proxy configuration, upgrade header handling, timeout guidance, and Socket.IO sticky-session discussion are consistent with Nginx, RFC 6455, and Socket.IO documentation. The `proxy_http_version 1.1` directive remains valid, though current Nginx documentation notes it is only required on versions before 1.29.7.
