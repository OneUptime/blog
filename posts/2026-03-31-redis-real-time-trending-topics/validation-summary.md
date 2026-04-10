# Validation Summary: How to Build a Real-Time Trending Topics System with Redis

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Redis Sorted Sets (ZINCRBY, ZREVRANGE, ZRANGE, ZCARD, EXPIRE)
- Python redis-py client library
- Python standard library (time, math, re)
- Redis pipelining

## Sources Consulted
- Redis ZINCRBY command documentation: https://redis.io/docs/latest/commands/zincrby/
- Redis ZREVRANGE command documentation: https://redis.io/docs/latest/commands/zrevrange/
- Redis ZRANGE command documentation: https://redis.io/docs/latest/commands/zrange/
- Redis ZCARD command documentation: https://redis.io/docs/latest/commands/zcard/
- Redis EXPIRE command documentation: https://redis.io/docs/latest/commands/expire/
- redis-py API reference: https://redis-py.readthedocs.io/en/stable/
- Python math.exp documentation: https://docs.python.org/3/library/math.html#math.exp
- Python re.findall documentation: https://docs.python.org/3/library/re.html#re.findall

## Issues Found

### 1. Unbounded sorted set key with no TTL (Basic Trending section)
**What was wrong:** The original code used a static key `"trending:topics"` with `zincrby` and no expiration. Scores accumulated indefinitely, meaning old popular topics would never leave the trending list and the sorted set would grow without bound — both a correctness issue and a memory leak.

**What was changed:** Replaced the static key with daily-bucketed keys (`trending:topics:{day_bucket}`) and added a 2-day TTL via `r.expire()`. The `get_trending` function was updated to read from the current day's bucket.

**Why:** A trending system must naturally age out old data. Without key rotation or expiration, the sorted set acts as an all-time leaderboard rather than a trending list. Daily bucketing ensures only recent data is considered and old keys are automatically cleaned up.

### 2. Misleading decay comment (Basic Trending section)
**What was wrong:** The comment said "Score decays exponentially over time" but the formula `math.exp(-DECAY_FACTOR * (now % 86400) / 3600)` computes a weight based on time-of-day (seconds since midnight UTC), not the age of a mention. Combined with the static key, this created a daily sawtooth pattern where scores jumped at midnight.

**What was changed:** Updated the comment to accurately describe the behavior: "Weight by position in the day — a simple daily decay cycle." With the daily-bucketed key fix, the midnight discontinuity no longer causes cross-day score contamination.

**Why:** The original comment implied true time-decay of historical mentions, which the formula did not implement. Accurate comments prevent readers from misunderstanding the scoring behavior.

## Review Notes
- `zrevrange` is deprecated in redis-py >= 4.x in favor of `zrange(key, start, end, desc=True)`. The command still works but readers using newer redis-py versions will see deprecation warnings. The post uses both `zrevrange` (basic and windowed sections) and `zrange` (velocity section).
- The basic decay formula gives higher scores to mentions earlier in the day within each daily bucket. This favors topics with sustained attention throughout the day over late-breaking spikes. The windowed and velocity-based approaches in subsequent sections are the recommended solution for true real-time trending.
- The velocity calculation only considers topics present in the current window. Topics that appeared in the previous window but not the current one are excluded, which is appropriate — a topic with zero current mentions is not trending.
- The `pipe.expire()` call in the windowed section runs on every mention, resetting the TTL. This is slightly redundant but not harmful and is a common Redis pattern.
- All redis-py API calls use correct argument order: `zincrby(name, amount, value)`, `zrevrange(name, start, end, withscores)`, `zrange(name, start, end, withscores)`.
- The bash monitoring command correctly mirrors the Python bucket calculation using awk integer division.
