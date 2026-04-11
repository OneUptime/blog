# Validation Summary: How to Implement Hierarchical Rate Limiting with Redis

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Redis (sorted sets, Lua scripting, EVAL)
- Python (redis-py client library)
- Flask (web framework middleware)
- Lua (Redis server-side scripting)

## Sources Consulted
- Redis EVAL command documentation: https://redis.io/docs/latest/commands/eval/
- Redis ZADD command documentation: https://redis.io/docs/latest/commands/zadd/
- Redis ZREMRANGEBYSCORE command documentation: https://redis.io/docs/latest/commands/zremrangebyscore/
- Redis ZCARD command documentation: https://redis.io/docs/latest/commands/zcard/
- Redis TIME command documentation: https://redis.io/docs/latest/commands/time/
- Redis Lua scripting documentation: https://redis.io/docs/latest/develop/interact/programmability/eval-intro/
- redis-py documentation: https://redis-py.readthedocs.io/
- Flask before_request documentation: https://flask.palletsprojects.com/

## Issues Found

### 1. Critical: Lua script incremented counters before checking all levels
**What was wrong:** The original Lua script used a single loop that checked a level's limit and then immediately added the request entry to that level's sorted set before moving to the next level. If a lower-priority level (e.g., user) passed but a higher-priority level (e.g., org or global) was exceeded, the lower-priority counters had already been incremented. This consumed quota on levels that passed for a request that was ultimately denied.

**What was changed:** Restructured the Lua script into two passes. The first pass cleans old entries and checks all limits without modifying counters. Only if all limits pass does the second pass add the request entry to all sorted sets. This ensures no counters are incremented for denied requests.

**Why:** Without this fix, users could have their per-user quota silently consumed by requests blocked at the org or global level, leading to premature rate limiting at the user level.

### 2. Minor: Flask example missing `import redis`
**What was wrong:** The Flask middleware code snippet used `redis.Redis(...)` without importing the `redis` module.

**What was changed:** Added `import redis` at the top of the Flask example.

**Why:** The code would raise a `NameError` at runtime without this import.

### 3. Minor: Flask example imported unused `g`
**What was wrong:** The Flask example imported `g` from `flask` but never used it.

**What was changed:** Removed `g` from the import statement.

**Why:** Unused imports are misleading and suggest incomplete code.

## Review Notes
- **`math.random` determinism in Redis < 7.0:** In Redis versions before 7.0, `math.random` in Lua scripts is seeded with a fixed value before each execution, producing the same sequence every time. This means concurrent requests within the same second could generate identical sorted set members (e.g., `1234567890-42`), causing ZADD to update rather than add, effectively undercounting requests. In Redis 7.0+ (released 2022), scripts use effect-based replication and `math.random` is properly randomized. For production use on older Redis, consider passing a unique request ID as an additional ARGV parameter instead of relying on `math.random`.
- **`redis.call('TIME')` and replication:** The `TIME` command is non-deterministic. In Redis < 7.0, scripts using `TIME` with write commands may need `redis.replicate_commands()` for correct replication behavior. In Redis 7.0+, effect-based replication handles this automatically.
- **Clock skew in `get_usage`:** The `get_usage` function uses `time.time()` (client clock) while the Lua script uses `redis.call('TIME')` (server clock). Clock skew between client and server could cause the usage function to report inaccurate counts relative to the actual rate limiter state.
- **`get_usage` side effects:** The `get_usage` function calls `zremrangebyscore` which mutates the sorted sets. This is generally fine since it mirrors the cleanup the Lua script does, but callers should be aware it modifies data.
