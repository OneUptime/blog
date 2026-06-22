# Validation Summary: How to Implement Real-Time Inventory Management with Redis

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Redis hashes, sorted sets, Pub/Sub, Lua scripting, and key expiry
- redis-py synchronous and asyncio clients
- Python
- FastAPI WebSockets and lifespan events
- JavaScript WebSocket client API

## Sources Consulted
- Redis Lua scripting documentation: https://redis.io/docs/latest/develop/programmability/eval-intro/
- redis-py Lua scripting documentation: https://redis.readthedocs.io/en/stable/lua_scripting.html
- Redis SETEX command documentation: https://redis.io/docs/latest/commands/setex/
- Redis HINCRBY command documentation: https://redis.io/docs/latest/commands/hincrby/
- Redis redis-py guide: https://redis.io/docs/latest/develop/clients/redis-py/
- Redis asyncio examples for redis-py: https://redis.readthedocs.io/en/stable/examples/asyncio_examples.html
- Redis FAQ on aioredis and redis-py asyncio: https://redis.io/faq/doc/26366kjrif/what-is-the-difference-between-aioredis-v2-0-and-redis-py-asyncio
- FastAPI WebSocket documentation: https://fastapi.tiangolo.com/advanced/websockets/
- FastAPI lifespan and deprecated event documentation: https://fastapi.tiangolo.com/advanced/events/
- FastAPI application reference for `on_event`: https://fastapi.tiangolo.com/reference/fastapi/

## Issues Found
- The Redis Lua reservation scripts generated and accessed `reservation_expiry:*` keys inside Lua. Redis scripting guidance requires accessed keys to be passed through `KEYS`, so the code now passes the expiry key explicitly to reserve, commit, and release scripts.
- The reservation script used `SETEX`, which Redis marks as deprecated since Redis 2.6.12. Replaced it with `SET ... EX`.
- The reservation comment claimed the expiry key provided auto-release, but expiring a marker key does not itself move stock from reserved back to available. Updated the comment to describe it as an expiry marker for a cleanup worker, and made expired commit attempts release the reservation before returning `RESERVATION_EXPIRED`.
- The atomic stock scripts accepted zero or negative quantities, which could incorrectly increase or otherwise corrupt stock counts. Added positive quantity validation to the relevant Lua scripts.
- The multi-SKU order script accepted inventory keys from Python but rebuilt inventory keys and the order key inside Lua. Updated it to use caller-provided `KEYS` for the order record and each inventory key.
- The FastAPI snippet used the deprecated `@app.on_event("startup")` API. Replaced it with a lifespan context manager that starts and cancels the Redis subscription task and closes the async Redis client.
- The async Redis snippet imported the standalone `aioredis` package. Redis documentation now recommends redis-py's asyncio API because aioredis was merged into redis-py. Updated the import to `redis.asyncio`.
- The WebSocket snippet used `Set`, `Dict`, `List`, and `json` without importing them in that snippet. Added the missing imports.
- Low-stock alerts were stored in a global `inventory:alerts` hash keyed only by SKU, which caused collisions between warehouses. Updated alert storage and lookup to use warehouse-specific alert hashes.

## Review Notes
- Python and JavaScript code blocks were syntax checked locally. Full runtime execution was not performed because this workspace does not have the `redis` or `fastapi` Python packages installed, and no Redis server is available.
- Multi-key Lua scripts may still need Redis Cluster hash tags in a production Redis Cluster deployment so all keys touched by a script live in the same hash slot.
