# Validation Summary: How to Use ZRANK and ZREVRANK in Redis to Get Member Rankings

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Redis (Sorted Sets)
- Redis CLI
- Python (redis-py client library)

## Sources Consulted
- Redis official documentation for ZRANK: https://redis.io/docs/latest/commands/zrank/
- Redis official documentation for ZREVRANK: https://redis.io/docs/latest/commands/zrevrank/
- Redis official documentation for ZADD: https://redis.io/docs/latest/commands/zadd/
- Redis official documentation for ZCARD: https://redis.io/docs/latest/commands/zcard/
- Redis official documentation for ZSCORE: https://redis.io/docs/latest/commands/zscore/
- redis-py documentation: https://redis-py.readthedocs.io/

## Issues Found
1. **Incorrect percentile value in User Leaderboard Position example** (line 153): The comment showed `'percentile': 20.0` for `player:2`, but the actual calculation yields 40.0. With `player:2` at ZREVRANK 3 out of 5 total players, the formula `(total - rank) / total * 100` gives `(5 - 3) / 5 * 100 = 40.0`, not 20.0. Fixed the comment to show the correct value.

## Review Notes
- All Redis command syntax and behavior descriptions are accurate.
- The WITHSCORE option is correctly noted as a Redis 7.2+ feature.
- All zero-based rank calculations in the basic examples are correct.
- The Python code uses the current redis-py API (`r.zadd()` with dict mapping, `r.zrevrank()`, `r.zrank()`, etc.), which is correct for redis-py 3.x+.
- The percentile calculation in the "Percentile Calculation" section uses ZRANK (low-to-high), which is a valid approach for computing percentiles where higher rank = higher percentile. This is distinct from the User Leaderboard section which uses ZREVRANK.
- The rank change tracking example has a potential race condition between reading old rank and writing new score in a concurrent environment, but this is acceptable for a tutorial-level example.
