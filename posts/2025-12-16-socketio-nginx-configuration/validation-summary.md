# Validation Summary: How to Configure Socket.io with Nginx

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Socket.IO
- Engine.IO transports
- Nginx reverse proxying
- WebSocket
- HTTP long-polling
- Redis adapter
- Nginx load balancing and sticky sessions
- curl
- wscat

## Sources Consulted
- Socket.IO reverse proxy documentation: https://socket.io/docs/v4/reverse-proxy/
- Socket.IO multiple nodes documentation: https://socket.io/docs/v4/using-multiple-nodes/
- Socket.IO Redis adapter documentation: https://socket.io/docs/v4/redis-adapter/
- Socket.IO server options documentation: https://socket.io/docs/v4/server-options/
- Nginx WebSocket proxying documentation: https://nginx.org/en/docs/http/websocket.html
- NGINX HTTP load balancing documentation: https://docs.nginx.com/nginx/admin-guide/load-balancer/http-load-balancer/
- Nginx upstream module documentation: https://nginx.org/en/docs/http/ngx_http_upstream_module.html
- Socket.IO CORS documentation: https://socket.io/docs/v4/handling-cors/
- curl CURLOPT_NOBODY documentation: https://curl.se/libcurl/c/CURLOPT_NOBODY.html
- MDN Sec-WebSocket-Key header reference: https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Sec-WebSocket-Key

## Issues Found
- The Redis adapter section incorrectly described Redis as sharing Socket.IO session state. Updated the wording and diagram labels to say the Redis adapter forwards packets/broadcasts through Redis Pub/Sub.
- The Redis adapter section implied Redis could replace sticky sessions. Added a clarification that sticky sessions are still required when HTTP long-polling is enabled, unless long-polling is disabled and WebSocket-only transport is used.
- The final summary said to use `ip_hash` or Redis adapter for scaling. Updated it to distinguish sticky-session routing from Redis-based cross-node broadcasting.
- The debug script used `curl -I` with only `Upgrade` and `Connection` headers to test WebSocket upgrades. `curl -I` sends a HEAD request and the sample omitted required WebSocket handshake headers, so it would not reliably test a Socket.IO WebSocket endpoint. Replaced it with an HTTP/1.1 GET handshake including `Sec-WebSocket-Version` and a valid 16-byte `Sec-WebSocket-Key`.

## Review Notes
- The Nginx WebSocket proxy headers, timeout guidance, `proxy_read_timeout` relationship to Socket.IO heartbeat settings, `ip_hash` examples, NGINX Plus sticky-cookie syntax, and Redis adapter code are consistent with current official documentation.
- The CORS example is syntactically valid for Nginx, but Socket.IO CORS is usually best configured in the Socket.IO server options. Socket.IO documentation also notes that CORS applies to HTTP long-polling, not WebSocket connections.
