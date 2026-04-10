# Validation Summary: How to Track API Response Times in Real-Time with Redis

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Redis (Sorted Sets, Hashes, Pipelines, ZUNIONSTORE)
- Python (redis-py client library)
- Bash (redis-cli)

## Sources Consulted
- Redis ZADD documentation: https://redis.io/commands/zadd
- Redis ZRANGE documentation: https://redis.io/commands/zrange
- Redis ZUNIONSTORE documentation: https://redis.io/commands/zunionstore
- Redis HINCRBY documentation: https://redis.io/commands/hincrby
- Redis HGETALL documentation: https://redis.io/commands/hgetall
- redis-py (Python Redis client) documentation: https://redis-py.readthedocs.io/
- Redis ZCARD documentation: https://redis.io/commands/zcard

## Issues Found
1. **Intro text incorrectly mentioned "Lists"**: The introductory paragraph stated "Redis Sorted Sets and Lists" but the post never uses Redis Lists. The data structures actually used are Sorted Sets (ZADD, ZRANGE, ZUNIONSTORE, ZCARD) and Hashes (HINCRBY, HGETALL). Changed "Lists" to "Hashes" to accurately reflect the content.

## Review Notes
- The `get_percentile` function runs `pipe.zcard(dest)` inside the pipeline but discards the result, then makes a separate `r.zcard(dest)` call. This adds an unnecessary round trip but is not incorrect. A future improvement could use the pipeline result directly.
- The percentile calculation uses a nearest-rank approximation (`int(total * percentile / 100)`), which is one of several accepted methods. This is a valid approach for real-time monitoring use cases.
- The `ZUNIONSTORE` call uses the default `SUM` aggregate, which is fine here because UUID-based members ensure no duplicates exist across minute-bucketed sets.
- The O(log N) complexity claim in the summary refers specifically to the ZRANGE retrieval of a single element, which is accurate. The full percentile computation including ZUNIONSTORE is more expensive, but the summary's framing is acceptable for a blog post.
