# Validation Summary: How to Scale WebSocket Connections

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- WebSocket
- NGINX and NGINX Plus load balancing
- Redis Pub/Sub
- ioredis
- Node.js
- ws WebSocket library
- Express
- Linux sysctl and file descriptor limits
- Horizontal scaling and health checks

## Sources Consulted
- NGINX WebSocket proxying documentation: https://nginx.org/en/docs/http/websocket.html
- NGINX upstream/load balancing documentation: https://nginx.org/en/docs/http/ngx_http_upstream_module.html
- NGINX Plus HTTP load balancing and session persistence documentation: https://docs.nginx.com/nginx/admin-guide/load-balancer/http-load-balancer/
- Redis Pub/Sub documentation: https://redis.io/docs/latest/develop/pubsub/
- ioredis Pub/Sub documentation: https://ioredis.readthedocs.io/en/stable/README/#pubsub
- ws API documentation: https://github.com/websockets/ws/blob/master/doc/ws.md
- Node.js process API documentation: https://nodejs.org/api/process.html
- Express 5.x API reference: https://expressjs.com/en/api/
- Linux kernel IP sysctl documentation: https://docs.kernel.org/networking/ip-sysctl.html

## Issues Found
- The cookie-based sticky session example used the `sticky` directive without noting that this is NGINX Plus session persistence syntax, not a built-in NGINX Open Source directive. I added a sentence clarifying that NGINX Open Source users should use `ip_hash` or `hash` unless they install a third-party sticky-session module.
- The Redis direct-message example published to `client:<id>` channels but did not subscribe the server to those client-specific channels when clients connected. I added `redisSub.subscribe(...)` on connection and `redisSub.unsubscribe(...)` on disconnect so direct messages can be delivered to clients connected to any server.
- The Linux tuning snippet described `net.ipv4.ip_local_port_range` as increasing local ports for many connections. That sysctl controls ephemeral local ports used for automatic port assignment, which mainly affects outbound connections. I updated the comment to say "ephemeral local ports available for outbound connections."

## Review Notes
- Redis Pub/Sub is technically appropriate for the example, but it has at-most-once delivery semantics. Applications that require persistence, replay, or stronger delivery guarantees should consider Redis Streams or another durable broker.
- The NGINX WebSocket proxy configuration is valid, and the official documentation also shows a `map`-based `Connection` header pattern for locations that may receive both upgrade and non-upgrade requests.
- `nginx` was not installed in the local environment, so the NGINX snippets were verified against official documentation rather than by running `nginx -t`.
