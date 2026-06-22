# Validation Summary: How to Reduce DB Load with Request Coalescing in Python

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Python
- asyncio
- asyncpg
- FastAPI
- TTL caching
- Request coalescing / single-flight request deduplication
- PostgreSQL

## Sources Consulted
- Python 3.12 asyncio tasks documentation: https://docs.python.org/3.12/library/asyncio-task.html
- Python 3.12 asyncio event loop documentation: https://docs.python.org/3.12/library/asyncio-eventloop.html
- FastAPI lifespan events documentation: https://fastapi.tiangolo.com/advanced/events/
- asyncpg API reference: https://magicstack.github.io/asyncpg/current/api/index.html
- OneUptime linked blog URLs, checked with HTTP HEAD requests: https://oneuptime.com/blog/post/2026-01-24-data-aggregation-service-python/view and https://oneuptime.com/blog/post/2026-01-22-token-bucket-rate-limiting-python/view

## Issues Found
- `asyncio.wait_for()` was used directly on shared futures. Python's documentation states that `wait_for()` cancels the awaited future on timeout or caller cancellation, which can break all coalesced waiters and make the background fetch fail when setting the result. Changed waits to use `asyncio.shield(future)` and guarded future completion with `future.done()` checks.
- The coalescer cleanup deleted `in_flight[key]` without confirming it still referred to the same future. Changed cleanup to compare future identity so an older timed-out request cannot remove a newer in-flight request for the same key.
- The examples used `asyncio.get_event_loop().create_future()` inside coroutines. Python's asyncio documentation prefers `asyncio.get_running_loop()` in coroutines and callbacks. Updated the snippets accordingly.
- The negative caching snippet did not import the symbols it used when treated as its own file. Added the required imports and `TypeVar`.
- The retry coalescer snippet did not import `asyncio`, typing helpers, `TypeVar`, or `CachingCoalescer` when treated as its own file. Added the required imports.
- The original negative caching implementation stored `None` in the normal cache key with the default TTL, so the shorter negative TTL marker would not control repeated "not found" responses. Reworked the snippet to cache positive values under the normal key and negative results under a separate negative marker with the shorter TTL.

## Review Notes
The examples are suitable for a single Python process. In multi-process or distributed deployments, request coalescing and in-memory TTL caches only deduplicate requests within each process unless backed by a shared coordination/cache layer.
