# Validation Summary: How to Build FastAPI WebSocket Chat with Redis

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Redis Pub/Sub
- FastAPI (WebSocket support)
- Python asyncio
- redis-py (async client)
- uvicorn
- WebSockets (browser API)

## Sources Consulted
- redis-py official documentation: https://redis.readthedocs.io/en/stable/
- redis-py pyproject.toml (extras check): https://github.com/redis/redis-py/blob/master/pyproject.toml
- FastAPI WebSocket documentation: https://fastapi.tiangolo.com/advanced/websockets/
- FastAPI lifespan events (deprecation of on_event): https://fastapi.tiangolo.com/advanced/events/
- uvicorn settings documentation: https://www.uvicorn.org/settings/
- uvicorn GitHub issue #1413 (--reload vs --workers): https://github.com/encode/uvicorn/issues/1413
- FastAPI HTMLResponse documentation: https://fastapi.tiangolo.com/advanced/custom-response/

## Issues Found

1. **Invalid pip extra `redis[asyncio]`**: The `[asyncio]` extra does not exist in redis-py. Async support is built into the core package. Changed `pip install fastapi uvicorn redis[asyncio] websockets` to `pip install fastapi uvicorn redis websockets`.

2. **Per-connection Redis subscription causing message duplication**: Each WebSocket connection created its own Redis Pub/Sub subscription to the same room channel. With N connections in a room, every message triggered `broadcast_to_room` N times, delivering each message N times to every client. Fixed by making `RedisPubSub.subscribe()` idempotent — it now tracks active subscriptions per channel and skips if already subscribed. Added `unsubscribe()` method for cleanup when a room empties.

3. **"Left the room" notification only broadcast locally**: The disconnect handler called `manager.broadcast_to_room()` directly instead of publishing through Redis Pub/Sub. This meant only clients connected to the same server instance saw leave notifications, defeating the purpose of the multi-server architecture. Fixed by publishing the leave message through `pubsub.publish()`.

4. **`--reload` and `--workers` are mutually exclusive in uvicorn**: The command `uvicorn main:app --reload --workers 4` silently ignores `--workers` when `--reload` is present. Split into separate development (`--reload`) and production (`--workers 4`) commands.

5. **HTML test client defined but not served**: The `CHAT_HTML` string was defined but the `@app.get("/")` endpoint returned a JSON response instead of the HTML. Fixed by importing `HTMLResponse` from `fastapi.responses` and returning `HTMLResponse(CHAT_HTML)`.

## Review Notes
- `@app.on_event("startup")` is deprecated since FastAPI 0.95 in favor of the `lifespan` async context manager pattern. The code still works but will emit deprecation warnings. A future update should migrate to `app = FastAPI(lifespan=lifespan)` with an `@asynccontextmanager` function.
- The import alias `import redis.asyncio as aioredis` is functional but potentially confusing, as `aioredis` was a separate package that has since been merged into redis-py. The idiomatic modern import is `import redis.asyncio as redis`.
- The HTML test client uses `innerHTML +=` which is vulnerable to XSS if message content contains HTML. For a production application, messages should be escaped or inserted via `textContent`.
