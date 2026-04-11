# Validation Summary: How to Configure Redis hz (Server Tick Rate)

## Status
validated

## Post Type
Tutorial / Configuration Guide

## Technologies Covered
- Redis (server configuration, `hz` and `dynamic-hz` parameters)
- Python (redis-py client library)
- Redis CLI (`CONFIG GET`, `CONFIG SET`, `INFO`)

## Sources Consulted
- Redis 7.2 source code (`server.c`) — `serverCron` function and dynamic-hz logic: https://github.com/redis/redis/blob/7.2/src/server.c
- Redis 7.2 source code (`server.h`) — `CONFIG_MIN_HZ`, `CONFIG_MAX_HZ`, `MAX_CLIENTS_PER_CLOCK_TICK`: https://github.com/redis/redis/blob/7.2/src/server.h
- Redis 7.2 source code (`db.c`) — `expireIfNeeded`, `existsCommand`, `dbsizeCommand`: https://github.com/redis/redis/blob/7.2/src/db.c
- Redis 7.2 source code (`redis-cli.c`) — `statMode` function: https://github.com/redis/redis/blob/7.2/src/redis-cli.c
- Redis 7.2 `redis.conf` — hz and dynamic-hz documentation: https://github.com/redis/redis/blob/7.2/redis.conf
- Redis DBSIZE command documentation: https://redis.io/docs/latest/commands/dbsize/
- Redis CLI documentation: https://redis.io/docs/latest/develop/tools/cli/

## Issues Found

### 1. False claim: "Run scheduled Lua scripts (if any)"
**What was wrong:** The list of background tasks controlled by `hz` included "Run scheduled Lua scripts (if any)." Redis has no concept of scheduled Lua scripts in its server cron. Lua scripts are executed synchronously via `EVAL`/`EVALSHA` commands only.
**What was changed:** Removed the bullet point entirely.

### 2. Incorrect command: `redis-cli --stat | grep expired`
**What was wrong:** The `redis-cli --stat` output contains columns for `keys`, `mem`, `clients`, `blocked`, `requests`, `connections`, and `child` — but no `expired` field. The `grep expired` would produce no output. Additionally, `INFO stats | grep expired_keys` was missing the `redis-cli` prefix needed for bash piping.
**What was changed:** Replaced both commands with `redis-cli INFO stats | grep expired_keys`, which correctly extracts the expired key count from the INFO output.

### 3. Incorrect claim: dynamic-hz scales "up to 10x the configured value"
**What was wrong:** The post claimed `dynamic-hz` multiplies the base hz "up to 10x the configured value." The actual cap is `CONFIG_MAX_HZ = 500` (defined in `server.h`), not a 10x multiplier. With base hz=10, the effective hz could theoretically reach 500 (50x), not just 100 (10x). The "10x" figure is not documented anywhere in Redis source or configuration.
**What was changed:** Updated to state that the effective hz scales based on client count up to the hard cap of 500 (`CONFIG_MAX_HZ`). Updated the redis.conf example comment accordingly.

### 4. Flawed Python benchmark using `EXISTS` instead of `DBSIZE`
**What was wrong:** The benchmark used `r.exists(f"test:{i}")` to count remaining expired keys. The `EXISTS` command triggers lazy expiry — when Redis checks a key and finds it expired, it deletes the key immediately (on master nodes, via `expireIfNeeded()` → `deleteExpiredKeyAndPropagate()`). This means every expired key would be lazily deleted during the measurement loop, causing both hz=10 and hz=100 to show 0 remaining keys, completely defeating the purpose of the benchmark.
**What was changed:** Replaced the benchmark with `r.dbsize()` which returns `dictSize(db->dict)` — the raw count of keys in the hash table including expired-but-not-yet-collected keys, without triggering lazy expiry. Added `r.flushdb()` calls to ensure a clean state before each test, and added a comment explaining why `DBSIZE` is used instead of `EXISTS`.

## Review Notes
- The section titled "hz vs aof-rewrite-incremental-fsync" is somewhat misleading — it doesn't actually discuss the relationship between `hz` and `aof-rewrite-incremental-fsync`. The section content is about monitoring CPU and latency when increasing hz. A more descriptive title would be "Monitoring the Impact of Higher hz." Left unchanged as this is a style issue, not a technical error.
- The recommended hz values table suggests hz=5 for "Low-traffic, save CPU" — this is valid (minimum is 1) but the official Redis documentation notes that lowering hz below default is rarely necessary. The recommendation is reasonable but niche.
- The post uses bare Redis commands (e.g., `CONFIG GET hz`) in bash-labeled code blocks, which is a common convention in Redis blog posts. Left unchanged as this is widely understood in context.
