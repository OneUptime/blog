# Validation Summary: How to Use Redis Sorted Sets for Leaderboards

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Redis sorted sets
- Redis sorted set commands: ZADD, ZRANGE, ZREVRANK, ZSCORE, ZINCRBY, ZCARD, ZREM, EXPIRE, PUBLISH/SUBSCRIBE
- redis-py
- Python

## Sources Consulted
- Redis ZRANGE command documentation: https://redis.io/docs/latest/commands/zrange/
- Redis ZREVRANGE command documentation: https://redis.io/docs/latest/commands/zrevrange/
- Redis ZREVRANGEBYSCORE command documentation: https://redis.io/docs/latest/commands/zrevrangebyscore/
- Redis ZREVRANK command documentation: https://redis.io/docs/latest/commands/zrevrank/
- Redis ZADD command documentation: https://redis.io/docs/latest/commands/zadd/
- Redis ZSCORE command documentation: https://redis.io/docs/latest/commands/zscore/
- Redis ZINCRBY command documentation: https://redis.io/docs/latest/commands/zincrby/
- Redis ZCARD command documentation: https://redis.io/docs/latest/commands/zcard/
- Redis ZREM command documentation: https://redis.io/docs/latest/commands/zrem/
- Redis EXPIRE command documentation: https://redis.io/docs/latest/commands/expire/
- Redis PUBLISH command documentation: https://redis.io/docs/latest/commands/publish/
- Redis sorted sets data type documentation: https://redis.io/docs/latest/develop/data-types/sorted-sets/
- redis-py command documentation: https://redis.readthedocs.io/en/stable/commands.html

## Issues Found
- The post used `zrevrange()` and `zrevrangebyscore()` in new code. Redis marks the corresponding `ZREVRANGE` and `ZREVRANGEBYSCORE` commands as deprecated as of Redis 6.2 and recommends `ZRANGE` with `REV` and `BYSCORE`. Updated the redis-py examples to use `zrange(..., desc=True)` and `zrange(..., byscore=True, desc=True)`.
- The time-based leaderboard snippet used `List[str]` without importing `List`, which would raise a `NameError` when defining the class. Added `from typing import List`.
- The real-time notification example used `old_rank + 1 if old_rank else None`, which incorrectly reports `None` when the old rank is `0`. Changed the condition to `old_rank is not None`.
- The tie-handling explanation said equal scores are ordered by member name. Updated the wording to specify lexicographical ordering and note that descending ranges reverse tie order.
- The summary table and best-practices list recommended `ZREVRANGE` for high-to-low rankings. Updated them to recommend `ZRANGE REV` / redis-py's `desc=True`.

## Review Notes
The examples are syntactically valid Python after the edits. The time-based leaderboard uses `%W` for week numbering; this is valid Python, but applications that require ISO week semantics may prefer `%G-W%V` or `datetime.isocalendar()`.
