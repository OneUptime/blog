# Validation Summary: How to Implement Multi-Tenancy with Redis Key Prefixes

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Redis (core key-value operations, SCAN, sorted sets, MEMORY USAGE, ACL)
- Python (redis-py client library)
- Flask (web framework integration)
- Node.js (ioredis-style Redis client)
- Express.js (middleware integration)

## Sources Consulted
- Redis ZADD documentation: https://redis.io/commands/zadd — verified sorted set member uniqueness semantics
- Redis ACL SETUSER documentation: https://redis.io/commands/acl-setuser — verified key pattern syntax (`~pattern`)
- Redis SCAN documentation: https://redis.io/commands/scan — verified cursor-based iteration API
- Redis MEMORY USAGE documentation: https://redis.io/commands/memory-usage — verified availability (Redis 4.0+)
- redis-py documentation: https://redis-py.readthedocs.io/ — verified `hset(mapping=)`, `pipeline()`, `scan()`, `set(ex=, px=, nx=, xx=)` APIs
- Python `str.removeprefix` documentation — confirmed available in Python 3.9+
- Flask `g` object and `before_request` documentation

## Issues Found

### 1. Rate limiter sorted set member collision (fixed)
**What was wrong:** The `check_rate_limit` function used `str(current_time)` (truncated to integer seconds via `int(time.time())`) as the sorted set member in `zadd`. Since sorted set members must be unique, multiple requests arriving within the same second would overwrite each other — the second request replaces the first rather than being added alongside it. This causes the rate limiter to silently undercount requests under any meaningful load.

**What was changed:**
- Changed the timestamp from `int(time.time())` to `time.time()` (float) for sub-second precision.
- Added `os.urandom(8).hex()` as a random suffix to the member name, guaranteeing uniqueness even for concurrent requests at the same microsecond.
- Added `import os` to support `os.urandom`.
- Changed `expire` TTL from `window_seconds` to `window_seconds + 1` to avoid a race where the key expires just before the final cleanup pass.

## Review Notes
- The Node.js code uses positional arguments for `scan()` and `set()` (e.g., `'EX', exSeconds`), which is consistent with `ioredis` but not `node-redis` v4 (which uses an options object). The post does not specify a client library, but the code is correct for ioredis, the most popular Node.js Redis client.
- The `get_tenant_redis` factory function creates a new `ConnectionPool` on every call. In production, the pool should be shared (as demonstrated in the Flask example). This is not technically wrong but is worth noting for readers adapting the code.
- The `pipeline()` usage in the rate limiter provides command batching but not true atomicity — another client could interleave commands between pipeline steps. For a rate limiter this imprecision is generally acceptable, but a Lua script would provide strict atomicity if needed.
- `str.removeprefix()` in `scan_tenant_keys` requires Python 3.9+. This is not called out in the post but is reasonable given Python 3.9 reached end-of-life is well past.
