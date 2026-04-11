# Validation Summary: How to Use EXPIRETIME in Redis to Get Expiration Timestamp

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Redis 7.0+ (EXPIRETIME, PEXPIRETIME commands)
- Python (redis-py client)
- Node.js (node-redis v4 client)
- Go (go-redis/v9 client)

## Sources Consulted
- Redis official documentation for EXPIRETIME: https://redis.io/commands/expiretime/
- Redis official documentation for PEXPIRETIME: https://redis.io/commands/pexpiretime/
- Redis official documentation for TTL: https://redis.io/commands/ttl/
- Redis official documentation for PTTL: https://redis.io/commands/pttl/
- redis-py API documentation: https://redis-py.readthedocs.io/
- node-redis documentation: https://github.com/redis/node-redis
- go-redis documentation: https://github.com/redis/go-redis

## Issues Found
1. **Node.js example: top-level `await` with CommonJS `require`** — The original code used `require('redis')` (CommonJS module syntax) alongside top-level `await` statements. Top-level `await` is only valid in ES modules, not CommonJS. Running this code as-is with Node.js would produce a `SyntaxError`. **Fix:** Wrapped the entire Node.js example body in an async IIFE `(async () => { ... })();` so that `await` is used within a valid async context while keeping the `require` import style.

## Review Notes
- All Redis command return values (-1 for persistent keys, -2 for non-existent keys) are correctly documented and match the official Redis docs.
- The comparison table (TTL, PTTL, EXPIRETIME, PEXPIRETIME) has accurate version information.
- The Go example correctly handles `go-redis/v9`'s `ExpireTime()` which returns a `DurationCmd` — the conversion via `.Seconds()` and `time.Unix()` is valid.
- The Python examples use `datetime.datetime.fromtimestamp(ts, tz=timezone.utc)` which is the correct timezone-aware approach.
- The cache refresh logic example is sound and demonstrates a practical use case well.
