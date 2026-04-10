# Validation Summary: How to Implement Rate Limiting with Burst Allowance in Redis

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Redis (Lua scripting, hash data structure, EVAL command)
- Python (redis-py client library)
- FastAPI (HTTP middleware)
- Token bucket algorithm

## Sources Consulted
- Redis EVAL command documentation: https://redis.io/docs/latest/commands/eval/
- Redis HMGET documentation: https://redis.io/docs/latest/commands/hmget/
- Redis HMSET documentation: https://redis.io/docs/latest/commands/hmset/
- Redis HSET documentation: https://redis.io/docs/latest/commands/hset/
- redis-py documentation: https://redis-py.readthedocs.io/
- FastAPI middleware documentation: https://fastapi.tiangolo.com/tutorial/middleware/
- RFC 9110 (HTTP Semantics) — Retry-After header: https://www.rfc-editor.org/rfc/rfc9110
- Token bucket algorithm (Wikipedia): https://en.wikipedia.org/wiki/Token_bucket

## Issues Found
1. **Inaccurate comparison in burst configuration table**: The "Strict limit" row (capacity=10, refill_rate=10) described the behavior as "No real burst - same as fixed window." A token bucket is fundamentally different from a fixed window rate limiter — fixed windows reset counters at interval boundaries and are susceptible to boundary-doubling (allowing 2x burst at window edges), while token buckets refill gradually. Changed to "Minimal burst - only 1 second of burst capacity" which correctly conveys the limited burst without the misleading algorithm comparison.

## Review Notes
- `HMSET` is deprecated since Redis 4.0.0 in favor of `HSET` (which now accepts multiple field-value pairs). The code still works correctly with all current Redis versions, but future tutorials should prefer `HSET`.
- The `HTTPException` import in the FastAPI code block is unused (only `JSONResponse` is used for the 429 response). This is cosmetic and does not affect functionality.
- The Python implementation uses `eval()` which sends the full Lua script text on every call. In production, `register_script()` (which uses `EVALSHA` under the hood) would be more efficient. Acceptable for a tutorial.
- The Lua script correctly handles fractional token values through storage in Redis hashes (stored as strings, parsed back with `tonumber()`), and uses `math.floor()` on return values to ensure clean integers cross the Redis-to-client boundary.
- The atomic execution of the Lua script in Redis correctly prevents race conditions in concurrent access scenarios.
