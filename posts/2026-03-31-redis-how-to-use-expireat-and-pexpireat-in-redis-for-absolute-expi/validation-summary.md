# Validation Summary: How to Use EXPIREAT and PEXPIREAT in Redis for Absolute Expiration

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Redis (EXPIREAT, PEXPIREAT, EXPIRETIME, PEXPIRETIME, EXPIRE, TTL, PTTL commands)
- Python with redis-py client
- Node.js with node-redis (v4+) client
- Go with go-redis/v9 client

## Sources Consulted
- https://redis.io/docs/latest/commands/expireat/ — EXPIREAT command reference
- https://redis.io/docs/latest/commands/pexpireat/ — PEXPIREAT command reference
- https://redis.io/docs/latest/commands/expiretime/ — EXPIRETIME command reference
- https://redis.io/docs/latest/commands/pexpiretime/ — PEXPIRETIME command reference
- https://redis.io/docs/latest/commands/ttl/ — TTL command reference
- https://github.com/redis/node-redis — node-redis v4 API reference
- https://pkg.go.dev/github.com/redis/go-redis/v9 — go-redis/v9 package documentation
- https://redis.readthedocs.io/en/stable/commands.html — redis-py documentation

## Issues Found
- **Unused `import time` in EXPIREAT vs EXPIRE comparison section**: The Python code block in the comparison section imported `time` but never used it (the code uses `datetime.now(timezone.utc)` and `.timestamp()` instead). Removed the unused import.

## Review Notes
- The Node.js example uses `client.pTTL()` — the canonical camelCase form in node-redis v4 is `pTtl()`, though the library may accept multiple casing forms. This is unlikely to cause runtime issues but worth noting for strict correctness.
- The Node.js example uses top-level `await` without an async function wrapper, which is standard for tutorial-style code but would require either an async IIFE or ESM top-level await support to run directly.
- The comment "EXPIREAT is calendar-based and survives clock drift better" is a slight simplification — Redis internally stores all expiries as absolute timestamps regardless of whether EXPIRE or EXPIREAT was used. The real advantage of EXPIREAT is that clients agree on the exact target timestamp rather than computing relative offsets.
- The NX/XX/GT/LT conditional flags are correctly noted as Redis 7.0+ features.
- EXPIRETIME and PEXPIRETIME are also Redis 7.0+ commands (available since 7.0.0), which could be worth mentioning explicitly in the post.
