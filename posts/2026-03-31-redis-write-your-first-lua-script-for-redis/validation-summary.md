# Validation Summary: How to Write Your First Lua Script for Redis

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Redis (EVAL command, Lua scripting engine)
- Lua (embedded scripting in Redis)
- Python (redis-py library)
- redis-cli (command-line interface)

## Sources Consulted
- Redis EVAL command documentation: https://redis.io/docs/latest/commands/eval/
- Redis Scripting with Lua guide: https://redis.io/docs/latest/develop/programmability/eval-intro/
- Redis Programmability overview: https://redis.io/docs/latest/develop/programmability/
- Redis Lua API reference: https://redis.io/docs/latest/develop/programmability/lua-api/
- Redis BLPOP command documentation: https://redis.io/docs/latest/commands/blpop/
- redis-py source (eval method): https://github.com/redis/redis-py/blob/master/redis/commands/core.py

## Issues Found

### 1. Outdated determinism requirement (Script Execution Rules, item 1)
- **What was wrong:** The post stated "Scripts must be deterministic - no random values or current time (use `redis.call('TIME')` for time)" as an absolute current rule. Since Redis 7.0 (released April 2022), verbatim script replication was removed entirely and replaced with effects-based replication. Scripts no longer need to be deterministic and can freely use `TIME`, `SRANDMEMBER`, `math.random()`, and other non-deterministic commands.
- **What was changed:** Updated to explain that the determinism requirement applied before Redis 7.0 and has been removed since, while noting `redis.call('TIME')` is available for getting server time.
- **Why:** For a blog post dated 2026, stating an outdated restriction as a current absolute rule is misleading to readers.

### 2. Inaccurate claim about blocking commands (Script Execution Rules, item 2)
- **What was wrong:** The post stated "Scripts cannot call blocking commands." In reality, blocking commands like BLPOP can be called from Lua scripts but they behave as their non-blocking equivalents (e.g., BLPOP behaves like LPOP with zero timeout). They don't error — they just don't block.
- **What was changed:** Updated to clarify that blocking commands can be called but behave as non-blocking equivalents, making them rarely useful in scripts.
- **Why:** Saying they "cannot" be called implies an error will occur, which is incorrect.

## Review Notes
- The EVAL syntax, KEYS/ARGV usage, Python redis-py examples, and all Lua code snippets are correct and functional.
- The `lua-time-limit` default of 5 seconds (5000ms) is correct. Note that Redis 7.0 introduced `busy-reply-threshold` as the newer canonical name, though `lua-time-limit` is still recognized.
- The post could mention `EVALSHA` and `SCRIPT LOAD` for caching frequently used scripts, but this is a scope choice appropriate for a "first script" tutorial.
- The post could mention Redis Functions (introduced in Redis 7.0) as the newer recommended approach for production Lua scripting, but this is not an error — EVAL remains fully supported.
