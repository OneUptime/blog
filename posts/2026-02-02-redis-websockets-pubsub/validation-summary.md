# Validation Summary: How to Use Redis with WebSockets for Pub/Sub

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Redis (Pub/Sub, Hashes, TTL)
- node-redis client library (v4 API)
- Socket.io
- @socket.io/redis-adapter
- ws (WebSocket library for Node.js)
- Express / Node http
- NGINX (load balancer / reverse proxy with WebSocket upgrade)

## Sources Consulted
- node-redis v4 documentation: https://github.com/redis/node-redis
- node-redis v4 pub/sub guide: https://github.com/redis/node-redis/blob/master/docs/pub-sub.md
- Socket.io Redis adapter: https://socket.io/docs/v4/redis-adapter/
- @socket.io/redis-adapter npm: https://www.npmjs.com/package/@socket.io/redis-adapter
- ws library API: https://github.com/websockets/ws/blob/master/doc/ws.md
- NGINX WebSocket proxying: https://nginx.org/en/docs/http/websocket.html
- NGINX ip_hash directive: https://nginx.org/en/docs/http/ngx_http_upstream_module.html#ip_hash
- Redis pub/sub command reference: https://redis.io/docs/latest/develop/interact/pubsub/

## Issues Found
No technical issues found.

All code samples use correct, current API surfaces:
- node-redis v4 camelCase commands (`hSet`, `hDel`, `hLen`, `hGetAll`, `expire`, `keys`) are accurate.
- The subscribe callback signature `(message) => {...}` is valid; v4 passes `(message, channel)` but ignoring the second argument is fine.
- `pubClient.duplicate()` for a subscriber client is the pattern shown in the official Socket.io Redis adapter docs.
- The constraint that a subscribed Redis client cannot issue other commands is accurate (Redis pub/sub mode restriction).
- NGINX `Upgrade`/`Connection` header pattern and `proxy_http_version 1.1` are the canonical NGINX WebSocket configuration.
- `ip_hash` for sticky sessions is correct (an alternative would be the `sticky` directive in NGINX Plus, but `ip_hash` is the open-source approach).

## Review Notes
- node-redis v5 has been released and is the current major version, but the v4 API shown in the post remains valid and widely used. No breaking changes affect the examples shown.
- The `KEYS` caveat in `cleanupServer` is acknowledged in a comment ("In production, use SCAN instead of KEYS for large datasets") — good practice.
- `ip_hash` has the well-known limitation of not balancing well when clients sit behind a single NAT/proxy, but the post's claim that it provides sticky sessions based on client IP is accurate.
- The `ConnectionManager.expire` call resets the TTL on the whole hash on every register/heartbeat, which is the intended behavior — readers should note that if a single user has multiple connections, removing one will not affect the others (also intended).
