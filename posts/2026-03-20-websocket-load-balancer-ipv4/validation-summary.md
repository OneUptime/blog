# Validation Summary: How to Scale WebSocket Servers Behind an IPv4 Load Balancer

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Nginx (upstream / reverse proxy / ip_hash)
- WebSocket protocol (RFC 6455)
- Redis Pub/Sub
- Node.js `ws` library
- Node.js `redis` client (node-redis v4+)
- Python `websockets` library
- Python `redis.asyncio` (redis-py 5.x)
- Kubernetes (ClusterIP, Nginx Ingress session affinity)

## Sources Consulted
- Nginx WebSocket proxying: https://nginx.org/en/docs/http/websocket.html
- Nginx `ngx_http_upstream_module` (ip_hash, keepalive): https://nginx.org/en/docs/http/ngx_http_upstream_module.html
- websockets library — broadcasting: https://websockets.readthedocs.io/en/stable/topics/broadcast.html
- websockets asyncio server reference: https://websockets.readthedocs.io/en/stable/reference/asyncio/server.html
- redis-py asyncio examples: https://redis.readthedocs.io/en/stable/examples/asyncio_examples.html
- node-redis v4→v5 migration guide: https://github.com/redis/node-redis/blob/master/docs/v4-to-v5.md
- Nginx Ingress session affinity annotations: https://kubernetes.github.io/ingress-nginx/examples/affinity/cookie/

## Issues Found
- **Python code used deprecated `ws.open` attribute.** The `websockets` library v14+ made the new asyncio implementation (`websockets.asyncio.server.ServerConnection`) the default, which does not expose `.open` — state is tracked via a `.state` enum. Relying on `ws.open` would raise `AttributeError` on current versions. Replaced the `asyncio.gather` + `ws.open` filter with `websockets.broadcast(local_clients, data)`, which is the library-recommended broadcast primitive (available since v10.1) and correctly handles concurrent sends and closed connections.

## Review Notes
- `ip_hash` is correct syntax, but it hashes the first three octets of the client IP (IPv4) and pins to one backend. This degrades under carrier-grade NAT / corporate proxies where many clients share the same public IP. For stickier behavior, the Kubernetes cookie-affinity alternative mentioned in the conclusion is a good fallback.
- `keepalive 32` in the upstream block is harmless but has limited effect for WebSocket traffic, since upgraded connections are long-lived and not returned to the keepalive pool.
- The Node.js `pub.publish(...)` call is not `await`ed. This is fire-and-forget — acceptable for a demo but means publish errors are not surfaced.
- The node-redis v4 subscribe callback signature shown is still supported in v5, though v5 also exposes a more efficient RESP3 push handler for advanced use cases.
- `r.aclose()` is the correct forward-compatible async close method in redis-py 5.0.1+ (replaces deprecated `close()`).
