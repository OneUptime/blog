# Validation Summary: How to Build a Weekly/Monthly Leaderboard with Redis

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Redis (Sorted Sets, TTL, Pipelines)
- Python (redis-py client library)
- redis-cli

## Sources Consulted
- Python `time.strftime` documentation: https://docs.python.org/3/library/time.html#time.strftime
- Python `time.gmtime` documentation: https://docs.python.org/3/library/time.html#time.gmtime
- Redis ZINCRBY command: https://redis.io/commands/zincrby
- Redis ZREVRANGE command: https://redis.io/commands/zrevrange
- Redis ZREVRANK command: https://redis.io/commands/zrevrank
- Redis ZADD command: https://redis.io/commands/zadd
- Redis EXPIRE command: https://redis.io/commands/expire
- Redis TTL command: https://redis.io/commands/ttl
- redis-py documentation: https://redis-py.readthedocs.io/en/stable/

## Issues Found

### 1. `time.gmtime()` result assigned but never used
- **What was wrong:** The variable `now = time.gmtime()` was assigned on line 22 to get the current UTC time, but all subsequent `time.strftime()` calls omitted the second argument. Without passing `now`, `strftime` uses the current local time rather than UTC. This contradicts the apparent intent and could produce inconsistent keys in distributed systems across time zones.
- **What was changed:** Added `now` as the second argument to all three `time.strftime()` calls so they use UTC time consistently.
- **Why:** `time.strftime(format)` defaults to `time.localtime()`. To use UTC as intended by the `gmtime()` call, the time tuple must be passed explicitly as `time.strftime(format, now)`.

### 2. Misleading "ISO week number" comment
- **What was wrong:** The comment `# ISO week number` was inaccurate. The `%W` format specifier gives the week number with Monday as the first day of the week, where days before the first Monday of the year fall in week 0. The actual ISO 8601 week number uses `%V` (with `%G` for ISO year), where week 1 is the week containing January 4th and there is no week 0.
- **What was changed:** Changed the comment from `# ISO week number` to `# Week number (Monday as first day)` to accurately describe what `%W` produces.
- **Why:** While `%W` works perfectly fine as a unique weekly key identifier, calling it "ISO" is technically incorrect and could mislead readers who need actual ISO week semantics.

## Review Notes
- The `zrevrange` method is deprecated in redis-py 4.x+ in favor of `zrange` with `rev=True`. The code still works but could emit deprecation warnings with newer redis-py versions. A future update could modernize these calls.
- The summary's claim that "pipeline ensures atomic multi-period updates" is acceptable because redis-py's `pipeline()` defaults to `transaction=True`, which wraps commands in MULTI/EXEC. However, this is atomic in the isolation sense (no interleaving), not in the full ACID sense (no rollback on partial failure).
- The `%W` week numbering means week 0 can exist (days before the first Monday). This is fine for leaderboard keying purposes but worth noting if readers need ISO-compliant week boundaries.
