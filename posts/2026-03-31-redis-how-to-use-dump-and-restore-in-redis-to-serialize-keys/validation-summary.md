# Validation Summary: How to Use DUMP and RESTORE in Redis to Serialize Keys

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Redis (DUMP, RESTORE, MIGRATE, PTTL commands)
- Python with redis-py client library
- Node.js with node-redis v4 client library

## Sources Consulted
- https://redis.io/docs/latest/commands/dump/ — DUMP command reference
- https://redis.io/docs/latest/commands/restore/ — RESTORE command syntax, options (REPLACE, ABSTTL, IDLETIME, FREQ)
- https://redis.io/docs/latest/commands/migrate/ — MIGRATE command reference and atomicity semantics
- https://redis.io/docs/latest/commands/pttl/ — PTTL return values (-1, -2, positive ms)
- redis-py source (redis/commands/core.py) — verified `dump()`, `restore()`, `pttl()`, `scan()`, `pipeline()` signatures
- node-redis v4 source (packages/redis, @redis/client) — verified `createClient`, `dump`, `pTTL`, `restore`, `lPush` APIs and option interfaces

## Issues Found
1. **Python `migrate_key` — PTTL check too narrow**: The single-key migration function used `pttl == -1` to detect keys with no expiry, but did not handle `pttl == -2` (key deleted between `dump` and `pttl` calls). Passing `-2` as TTL to RESTORE would cause an error. Changed to `pttl < 0` to match the batch migration code later in the same post, which already used `pttl < 0` correctly.

2. **Node.js — CommonJS `require` with top-level `await`**: The code used `const { createClient } = require('redis')` (CommonJS) but then used top-level `await` statements (`await source.connect()`, etc.), which only work in ES modules. This would produce a `SyntaxError` at runtime in a standard Node.js CommonJS environment. Wrapped the entire code body in an async IIFE `(async () => { ... })();` to make it valid CommonJS.

## Review Notes
- The RESTORE syntax listing in the "RESTORE Options" section omits the argument names for IDLETIME and FREQ (shows `[IDLETIME] [FREQ]` instead of `[IDLETIME seconds] [FREQ frequency]`), though the bullet points below explain that they take values. The initial syntax block in "What Are DUMP and RESTORE" has the full correct syntax, so this is a minor presentational inconsistency rather than an error.
- The MIGRATE section accurately describes the default behavior (DUMP+RESTORE+DEL) but does not mention the `COPY` flag (available since Redis 3.0) which skips the source deletion. This is not an error but could be a useful addition for readers who want to copy rather than move keys.
- All Python redis-py API calls (dump, restore, pttl, scan, pipeline) are correct and match current library signatures.
- All Node.js node-redis v4 API calls (dump, pTTL, restore with `{ REPLACE: true }`, lPush with array) are correct and match current library interfaces.
