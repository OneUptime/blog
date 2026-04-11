# Validation Summary: How to Delete Keys and Flush Data in Redis

## Status
validated

## Post Type
Tutorial / Reference Guide

## Technologies Covered
- Redis (DEL, UNLINK, SCAN, FLUSHDB, FLUSHALL, EXPIRE, EXPIREAT, TTL, PERSIST, LREM, SREM, HDEL, ZREM, EVAL)
- redis-cli (command-line interface)
- Node.js with ioredis library
- Python with redis-py library
- Bash scripting

## Sources Consulted
- Redis SCAN command documentation: https://redis.io/docs/latest/commands/scan/
- Redis CLI documentation: https://redis.io/docs/latest/develop/tools/cli/
- Redis DEL command documentation: https://redis.io/docs/latest/commands/del/
- Redis UNLINK command documentation: https://redis.io/docs/latest/commands/unlink/
- Redis FLUSHDB command documentation: https://redis.io/docs/latest/commands/flushdb/
- Redis FLUSHALL command documentation: https://redis.io/docs/latest/commands/flushall/
- ioredis documentation: https://github.com/redis/ioredis
- redis-py documentation: https://github.com/redis/redis-py

## Issues Found

### 1. Broken bash SCAN + delete loop
**What was wrong:** The bash script for deleting keys by pattern used `redis-cli SCAN 0 MATCH "session:*" COUNT 100 | while read cursor keys; do ...`. This is fundamentally broken because: (a) `redis-cli SCAN` outputs the cursor on line 1 and each key on separate subsequent lines, so `while read cursor keys` cannot parse this correctly; (b) the script only calls SCAN once and never re-invokes with the returned cursor, so it would only process the first batch at most; (c) in practice, this script would not delete any keys.

**What was changed:** Replaced with the idiomatic `redis-cli --scan --pattern "session:*" | xargs redis-cli UNLINK` approach. The `--scan` flag handles cursor iteration automatically and outputs one key per line, which pipes cleanly to `xargs`. Also added a batched variant using `xargs -L 100`.

**Why:** `redis-cli --scan` is the documented, production-safe way to iterate keys from the command line. It abstracts away cursor management entirely.

### 2. Misleading "count keys by pattern" example
**What was wrong:** The "Count keys matching a pattern (approximate)" section used `redis-cli SCAN 0 MATCH "cache:*" COUNT 1000`, which does not return a count. It returns a cursor and a partial list of matching keys from one SCAN iteration. The COUNT parameter in SCAN is a hint for how many keys to inspect per iteration, not a limit on results.

**What was changed:** Replaced with `redis-cli --scan --pattern "cache:*" | wc -l`, which actually counts all matching keys by iterating through the full keyspace and counting output lines.

**Why:** The original command was misleading — it did not count anything and would confuse readers expecting a numeric count.

## Review Notes
- The Node.js (ioredis) and Python (redis-py) code examples are correct and follow best practices with proper SCAN iteration and UNLINK usage.
- The EXISTS-then-DEL pattern mentioned in the post is noted as "useful conceptually," which is appropriate since DEL alone handles non-existent keys gracefully (returns 0). In concurrent environments, the EXISTS+DEL two-step has a race condition, but the post doesn't recommend it as a best practice.
- The Lua EVAL script for counting keys (`return #redis.call('keys', ARGV[1])`) correctly uses KEYS internally and is appropriately warned about being limited to small datasets.
- The ASYNC option for FLUSHDB/FLUSHALL was introduced in Redis 4.0 alongside UNLINK. The post doesn't mention version requirements, but these features are widely available in any modern Redis deployment.
