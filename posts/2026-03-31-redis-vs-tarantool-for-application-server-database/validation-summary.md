# Validation Summary: Redis vs Tarantool for Application Server and Database

## Status
validated

## Post Type
Comparison / Technical Guide

## Technologies Covered
- Redis (in-memory data store, Lua scripting via EVAL, MULTI/EXEC transactions)
- Tarantool (in-memory database + Lua application server, ACID transactions, secondary indexes)
- Python tarantool client library
- Lua programming language

## Sources Consulted
- Redis EVAL / programmability documentation: https://redis.io/docs/latest/develop/interact/programmability/eval-intro/
- Redis Lua API reference: https://redis.io/docs/latest/develop/programmability/lua-api/
- Redis transactions documentation: https://redis.io/docs/latest/develop/using-commands/transactions/
- Redis MULTI command documentation: https://redis.io/docs/latest/commands/multi/
- Tarantool official documentation: https://www.tarantool.io/en/doc/latest/
- Tarantool box.space API: https://www.tarantool.io/en/doc/latest/reference/reference_lua/box_space/
- Tarantool box.schema.func API: https://www.tarantool.io/en/doc/latest/reference/reference_lua/box_schema/func_create/
- Tarantool transaction documentation: https://www.tarantool.io/en/doc/latest/book/box/atomic/
- Tarantool Python connector (tarantool-python) source and documentation
- Tarantool SQL documentation: https://www.tarantool.io/en/doc/latest/reference/reference_sql/

## Issues Found

### 1. Misleading "optimistic" characterization of Redis MULTI/EXEC
- **What was wrong:** The post described Redis MULTI/EXEC as "optimistic" on line 102 and in the comparison table. MULTI/EXEC alone is not optimistic locking -- it is batched atomic execution without rollback. Optimistic locking in Redis specifically requires the WATCH command (check-and-set pattern).
- **What was changed:** Changed "Redis's MULTI/EXEC is optimistic (no rollback on command failure)" to "Redis's MULTI/EXEC batches commands atomically but provides no rollback on individual command failure". Changed comparison table entry from "Optimistic MULTI/EXEC" to "MULTI/EXEC (no rollback)".
- **Why:** The term "optimistic" has a specific meaning in database terminology (optimistic concurrency control), which only applies when WATCH is used. Without WATCH, MULTI/EXEC is simply a command batch.

### 2. Incorrect claim that Tarantool SQL is provided via vshard
- **What was wrong:** The comparison table stated Tarantool's query language is "Lua API + SQL (via vshard)". SQL is a native built-in feature of Tarantool accessed via `box.execute()`, not provided through vshard. vshard is a separate sharding module for distributing data across nodes.
- **What was changed:** Changed "Lua API + SQL (via vshard)" to "Lua API + SQL (native)".
- **Why:** Conflating vshard (sharding) with SQL (query language) is factually incorrect and could mislead readers about Tarantool's architecture.

### 3. Incorrect Python client `conn.call()` argument passing
- **What was wrong:** The Python example used `conn.call("get_or_create_user", [42, "alice@example.com"])`, passing a list as a single argument. The `tarantool-python` client's `call()` method uses `*args`, so this would pass the entire list as one argument to the stored procedure instead of two separate arguments.
- **What was changed:** Changed to `conn.call("get_or_create_user", 42, "alice@example.com")` with separate positional arguments.
- **Why:** The stored procedure `get_or_create_user(id, email)` expects two separate arguments, not a single list argument.

## Review Notes
- Redis Functions (introduced in Redis 7.0) are not mentioned. EVAL is not deprecated, so this is not an error, but a future update could note Functions as the modern alternative to EVAL scripts.
- The `box.schema.func.create` pattern used in the Tarantool example is the classic/legacy approach. Modern Tarantool 2.x+ supports persistent functions with the `body` parameter. The pattern shown still works correctly but requires the Lua file to be re-executed on restart.
- The Redis Lua script accesses a key (`KEYS[1] .. ':hits'`) not passed in the KEYS array, which violates Redis Cluster compatibility rules. This is valid in standalone Redis but would fail in cluster mode.
- Tarantool's ACID durability depends on WAL configuration (`wal_mode`). With default settings, durability is ensured.
