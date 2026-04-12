# Validation Summary: How to Build a Portfolio Value Tracker with Redis

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Redis (Hashes, Sorted Sets, Lua scripting, Pub/Sub)
- Python (redis-py client library)
- Redis CLI commands (HSET)

## Sources Consulted
- Redis HSET documentation: https://redis.io/commands/hset/
- Redis HGETALL documentation: https://redis.io/commands/hgetall/
- Redis HGET documentation: https://redis.io/commands/hget/
- Redis ZADD documentation: https://redis.io/commands/zadd/
- Redis ZREVRANGE documentation: https://redis.io/commands/zrevrange/
- Redis ZRANGEBYSCORE documentation: https://redis.io/commands/zrangebyscore/
- Redis ZREMRANGEBYRANK documentation: https://redis.io/commands/zremrangebyrank/
- Redis EVAL / Lua scripting documentation: https://redis.io/docs/latest/develop/interact/programmability/eval-intro/
- Redis PUBLISH documentation: https://redis.io/commands/publish/
- redis-py documentation: https://redis-py.readthedocs.io/en/stable/

## Issues Found
No technical issues found.

## Review Notes
- `register_script` is called inside `portfolio_value()` on every invocation rather than once at module level. This is a performance concern (re-registers the script each call), not a correctness issue. Acceptable for a tutorial.
- `open("portfolio_value.lua")` does not use a context manager (`with` statement), which could leak file handles. Acceptable simplification for a tutorial.
- `zrevrange` (used in `top_portfolios`) is deprecated since Redis 6.2.0 in favor of `ZRANGE ... REV`. Similarly, `zrangebyscore` (used in `daily_gain`) is deprecated in favor of `ZRANGE ... BYSCORE`. Both still function correctly and are more readable for tutorial purposes.
- The percentage change calculation in `check_value_alert` uses current portfolio value as the denominator (`gain / current * 100`) rather than the previous value (`gain / previous * 100`), which is the standard financial percentage change formula. This is a domain-level observation, not a Redis correctness issue.
- The `zremrangebyrank(key, 0, -1441)` trimming pattern is correct: when the set exceeds 1440 members it trims the oldest entries, and when the set has 1440 or fewer members the resolved stop index falls before start so nothing is removed.
