# Validation Summary: How to Implement A/B Testing Framework with Redis

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Redis (Hashes, INCR counters, GET/HGET/HSET commands)
- Python 3.10+ (type hint syntax with `list[dict]`, `dict | None`)
- redis-py (Python Redis client)
- FastAPI (web framework integration)
- hashlib (MD5 for deterministic bucketing)

## Sources Consulted
- redis-py official documentation: https://redis-py.readthedocs.io/en/stable/
- Redis HSET command reference: https://redis.io/commands/hset/
- Redis INCR command reference: https://redis.io/commands/incr/
- Redis HGETALL command reference: https://redis.io/commands/hgetall/
- FastAPI lifespan events documentation: https://fastapi.tiangolo.com/advanced/events/
- FastAPI Cookie parameter documentation: https://fastapi.tiangolo.com/tutorial/cookie-params/
- Python hashlib documentation: https://docs.python.org/3/library/hashlib.html

## Issues Found

1. **Misleading architecture description**: The introductory section stated "Sorted Sets can distribute traffic, and HyperLogLog or counters track impressions and conversions." The actual implementation never uses Sorted Sets or HyperLogLog — it uses hash-based bucketing for variant assignment and simple INCR counters for tracking. Changed to "Redis Hashes store experiment config and variant assignments, and simple counters track impressions and conversions" to accurately reflect the implementation.

2. **Deprecated FastAPI startup event**: The FastAPI integration used `@app.on_event("startup")`, which has been deprecated since FastAPI 0.93.0 (January 2023) in favor of the `lifespan` context manager pattern. Updated to use `@asynccontextmanager` with `async def lifespan(app)` and `FastAPI(lifespan=lifespan)`, which is the current recommended approach.

## Review Notes
- The `hashlib.md5` usage is appropriate here since it's used for deterministic bucketing, not for security purposes. No change needed.
- The impression counter increments on every call to `get_variant_for_user`, meaning repeat visits by the same user count as multiple impressions. This is a valid design choice (counting page views rather than unique visitors), but users building on this code should be aware of the distinction.
- The `created_at` field is stored as an integer via `hset` but would be returned as a string by `hgetall`. Since it's never read back in the code, this is not a bug, but consumers of `get_experiment` should be aware that numeric fields come back as strings.
