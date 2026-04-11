# Validation Summary: How to Build a URL Shortener with Redis

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Redis (Hashes, Sorted Sets, Pipelines, INCR, HINCRBY, ZINCRBY, EXPIRE)
- Python 3.10+ (type union syntax `str | None`)
- redis-py (Python Redis client)
- FastAPI (web framework with RedirectResponse)
- Base62 encoding for short code generation

## Sources Consulted
- Redis HSET documentation: https://redis.io/commands/hset
- Redis ZINCRBY documentation: https://redis.io/commands/zincrby
- Redis ZRANGEBYSCORE documentation: https://redis.io/commands/zrangebyscore
- Redis ZREVRANGE documentation: https://redis.io/commands/zrevrange
- redis-py API reference: https://redis-py.readthedocs.io/en/stable/
- FastAPI path operations ordering: https://fastapi.tiangolo.com/tutorial/path-params/#order-matters
- Python `string` module documentation: https://docs.python.org/3/library/string.html

## Issues Found

1. **Unused `hashlib` import**: The `hashlib` module was imported but never used anywhere in the code. Removed the unused import.

2. **FastAPI route ordering bug**: The catch-all route `/{short_code}` was defined before `/analytics/{short_code}`. In FastAPI (Starlette), routes are matched in declaration order, so a request to `/analytics/abc123` would match `/{short_code}` with `short_code="analytics"` and never reach the analytics endpoint. Fixed by moving `/analytics/{short_code}` above `/{short_code}`.

3. **`url:global:clicks` sorted set never populated**: The `get_top_urls()` function reads from `url:global:clicks`, but `track_click()` never wrote to this key, so the function would always return an empty list. Added `pipe.zincrby("url:global:clicks", 1, short_code)` to the `track_click()` pipeline.

4. **URL Storage Design schema didn't match code**: The schema section listed `url:clicks:{short_code}` as the only sorted set key, but the actual code uses `url:clicks:hourly:{short_code}`, `url:clicks:daily:{short_code}`, `url:referrers:{short_code}`, and `url:global:clicks`. Updated the schema to accurately reflect all keys used in the implementation.

## Review Notes
- The custom alias creation has a race condition: `exists()` + `set()` is not atomic, so two concurrent requests could both claim the same alias. A production system should use a Lua script or `SET NX` for atomic check-and-set. This is acceptable for a tutorial but worth noting.
- The `track_click` function accepts a `country` parameter that is never used in the function body. This appears to be a placeholder for future functionality.
- The `resolve_url` function calls `track_click(short_code)` without forwarding `referrer` or `country` from the HTTP request context. A production implementation would extract these from request headers.
- The `/shorten` POST endpoint accepts parameters as query parameters rather than a JSON request body, which is unconventional for POST endpoints. A Pydantic model would be more idiomatic FastAPI.
- The `str | None` return type annotation requires Python 3.10+. Earlier versions would need `Optional[str]` from `typing`.
