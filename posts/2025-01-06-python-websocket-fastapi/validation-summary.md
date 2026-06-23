# Validation Summary: How to Implement WebSocket Connections in Python with FastAPI

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Python (asyncio)
- FastAPI
- Starlette (underlying WebSocket implementation)
- WebSocket protocol
- python-jose (JWT authentication)
- Pydantic
- redis-py (`redis.asyncio`) pub/sub for horizontal scaling

## Sources Consulted
- FastAPI WebSockets reference — https://fastapi.tiangolo.com/reference/websockets/
- FastAPI WebSockets tutorial — https://fastapi.tiangolo.com/advanced/websockets/
- Starlette WebSockets docs — https://www.starlette.io/websockets/
- WebSocket close codes (RFC 6455 + application range 4000–4999) — https://websocket.org/reference/close-codes/
- Python `datetime` docs (utcnow deprecation) — https://docs.python.org/3/library/datetime.html
- "datetime.utcnow() is now deprecated" — https://blog.miguelgrinberg.com/post/it-s-time-for-a-change-datetime-utcnow-is-now-deprecated
- redis-py asyncio / pub-sub docs — https://redis.readthedocs.io/en/stable/connections.html#redis.asyncio.client.Redis

## Issues Found
- **Deprecated `datetime.utcnow()` (Production Connection Manager snippet).** The heartbeat loop used `datetime.utcnow().isoformat()`. `datetime.utcnow()` was deprecated in Python 3.12 and is scheduled for removal in Python 3.14; it also returns a naive (non-timezone-aware) datetime. Fixed by importing `timezone` (`from datetime import datetime, timezone`) and changing the call to `datetime.now(timezone.utc).isoformat()`, which produces a timezone-aware UTC timestamp.

## Review Notes
- The authentication examples call `await websocket.close(code=4001)` *before* `accept()`. This is a valid and commonly recommended Starlette/FastAPI pattern for rejecting unauthorized connections; codes 4000–4999 are reserved for application use. Note (not an error): when the handshake is rejected before `accept()`, browser clients typically observe a failed connection rather than reading the custom 4001 code, but the rejection itself works correctly.
- `get_user_from_token` is annotated `-> dict` but can return `None` on invalid tokens. This is harmless in practice and consistent with the surrounding example style; a stricter annotation would be `Optional[dict]`. Left as-is to avoid stylistic churn.
- The Redis pub/sub snippet references `Dict` and `WebSocket` without importing them in that isolated block. As a standalone scaling illustration this is acceptable; in a real module these come from `typing` and `fastapi`, matching the earlier snippets.
- The heartbeat pattern uses application-level JSON `{"type": "ping"}` messages (not protocol-level WebSocket ping/pong frames). This is a legitimate approach and is what keeps connections alive through proxies/load balancers, as the text describes.
- Running a concurrent heartbeat send task alongside the receive loop is safe in Starlette: concurrent send and receive from separate tasks is supported; only concurrent *receives* would be problematic, which the code avoids.
- The `import redis.asyncio as aioredis` comment correctly notes that the standalone `aioredis` package is deprecated and merged into redis-py (>=4.2.0). All redis-py async API calls used (`from_url`, `pubsub`, `subscribe`, `listen`, `publish`) are current.
