# Validation Summary: How to Model User Profiles in Redis

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Redis (Hashes, key expiry, atomic increments, transactions)
- Python (redis-py client library)

## Sources Consulted
- Redis official documentation for HSET: https://redis.io/docs/latest/commands/hset/
- Redis official documentation for HMGET: https://redis.io/docs/latest/commands/hmget/
- Redis official documentation for HGETALL: https://redis.io/docs/latest/commands/hgetall/
- Redis official documentation for HINCRBY: https://redis.io/docs/latest/commands/hincrby/
- Redis official documentation for HINCRBYFLOAT: https://redis.io/docs/latest/commands/hincrbyfloat/
- Redis official documentation for EXPIRE: https://redis.io/docs/latest/commands/expire/
- Redis official documentation for DEL: https://redis.io/docs/latest/commands/del/
- Redis official documentation for pipelining: https://redis.io/docs/latest/develop/use/pipelining/
- Redis official documentation for transactions: https://redis.io/docs/latest/develop/interact/transactions/
- redis-py documentation: https://redis-py.readthedocs.io/en/stable/

## Issues Found
1. **Line 102 — Incorrect claim that a pipeline provides atomicity for deletion.**
   - **What was wrong:** The post stated "use a Lua script or pipeline to make the deletion atomic." A Redis pipeline is a network optimization that batches commands to reduce round trips, but it does **not** provide atomicity. Other client commands can be interleaved between the individual commands in a pipeline.
   - **What was changed:** Replaced "pipeline" with "transaction (`MULTI/EXEC`)" since Redis transactions (MULTI/EXEC) do guarantee that commands are executed as an atomic unit without interleaving from other clients.
   - **Why:** Readers following this advice and using a pipeline instead of a transaction or Lua script could encounter race conditions where another client sees a partially deleted user (e.g., the main profile key is deleted but preference or session keys still exist).

## Review Notes
- The post correctly uses `HSET` with multiple field-value pairs, which is the modern approach (supported since Redis 4.0). The older `HMSET` command is deprecated in favor of variadic `HSET`.
- The Python code uses `r.hset(key, mapping=profile)` which is the correct redis-py API for setting multiple hash fields from a dictionary.
- The `load_from_database` function is referenced but not defined — this is fine as it's clearly a placeholder for the reader's own database access layer.
- The deletion section uses three separate `DEL` commands. While correct, `DEL` supports multiple keys in a single call (`DEL user:1001 user:1001:prefs user:1001:sessions`), which is more efficient and itself atomic. This is a minor optimization opportunity, not an error.
