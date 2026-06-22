# Validation Summary: How to Implement Token Bucket Rate Limiting in Python

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Python
- FastAPI
- asyncio
- Redis / redis-py
- Lua scripting in Redis
- HTTP 429 rate limiting responses

## Sources Consulted
- Python `time.monotonic()` documentation: https://docs.python.org/3/library/time.html#time.monotonic
- Python `threading.Lock` documentation: https://docs.python.org/3/library/threading.html#lock-objects
- Python `asyncio.Lock` documentation: https://docs.python.org/3/library/asyncio-sync.html#lock
- Python `dataclasses` documentation: https://docs.python.org/3/library/dataclasses.html
- FastAPI dependencies documentation: https://fastapi.tiangolo.com/tutorial/dependencies/
- FastAPI advanced / parameterized dependencies documentation: https://fastapi.tiangolo.com/advanced/advanced-dependencies/
- FastAPI `Depends` reference: https://fastapi.tiangolo.com/reference/dependencies/
- FastAPI behind a proxy documentation: https://fastapi.tiangolo.com/advanced/behind-a-proxy/
- redis-py asyncio examples: https://redis.readthedocs.io/en/stable/examples/asyncio_examples.html
- Redis `HMSET` command documentation: https://redis.io/docs/latest/commands/hmset/
- Redis `HSET` command documentation: https://redis.io/docs/latest/commands/hset/
- RFC 6585, HTTP 429 Too Many Requests: https://datatracker.ietf.org/doc/html/rfc6585#section-4

## Issues Found
- The thread-safe cleanup example checked bucket token counts without refilling them first, so clients that became inactive after consuming tokens could remain in memory indefinitely. Updated cleanup to lock each bucket, refill it, and then check whether it is full enough to remove.
- The FastAPI dependency example could not be parameterized correctly for the expensive endpoint and the text claimed it consumed 10 tokens while the code consumed only 1. Replaced it with a dependency factory and used `Depends(rate_limit_dependency(tokens=10))`.
- The FastAPI variable-cost example used `Depends(lambda r: rate_limit_with_cost(r, "read"))`, which would make `r` a request/query parameter rather than FastAPI's `Request`, and would return an un-awaited coroutine from a synchronous lambda. Replaced it with a proper dependency factory.
- The variable-cost example referenced `get_client_id` and `rate_limiter` without defining them in the snippet. Added minimal definitions so the example is complete.
- The Redis async connection example used `await redis.from_url(...)`, but redis-py documents `redis.from_url(...)` as returning a client object directly. Removed the incorrect `await`.
- The Redis close example used `close()` instead of the documented async `aclose()` pattern. Updated it to `await self.client.aclose()`.
- The Redis Lua script used deprecated `HMSET`. Redis documents `HMSET` as deprecated since Redis 4.0.0 and recommends variadic `HSET`, so the script now uses `HSET`.
- The FastAPI client ID helper trusted `X-Forwarded-For` without a caveat. Added a note that it should only be trusted when the application is behind a trusted proxy.
- Removed unused `Optional` and `asynccontextmanager` imports from examples while correcting the affected snippets.

## Review Notes
All Python code blocks were parsed with Python 3.12.3 after edits and are syntactically valid. FastAPI and redis-py were not installed in the repository environment, so runtime verification against those packages was based on official documentation rather than local imports.
