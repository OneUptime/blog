# Validation Summary: How to Implement a Rolling Window Rate Counter with Redis

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Redis (key-value store, INCR, EXPIRE, MGET, DELETE commands)
- Python (redis-py client library)
- Rate limiting (sliding window counter pattern using sub-interval buckets)

## Sources Consulted
- Redis INCR command documentation: https://redis.io/docs/latest/commands/incr/
- Redis EXPIRE command documentation: https://redis.io/docs/latest/commands/expire/
- Redis MGET command documentation: https://redis.io/docs/latest/commands/mget/
- redis-py library documentation: https://redis-py.readthedocs.io/
- Sliding window rate limiting design pattern (Cloudflare blog, system design references)

## Issues Found
1. **Misleading docstring in `increment_rolling`**: The docstring stated "Returns the approximate count in the rolling window" but the function returns the result of `r.incr(key)`, which is only the count in the current sub-bucket, not the total rolling window count. Fixed to say "Returns the count in the current sub-bucket." This did not affect functional correctness since no caller depends on the return value for rolling totals — they all call `get_rolling_count` separately.

## Review Notes
- The `INCR` and `EXPIRE` commands in `increment_rolling` are not atomic. In production, a Redis pipeline or Lua script would be more robust to prevent orphaned keys (keys without TTLs) if a failure occurs between the two commands. This is an acceptable simplification for a tutorial.
- `check_rate_limit` always increments the counter before checking the limit, meaning over-limit requests still consume a count. Under heavy over-limit traffic, this can cause legitimate requests to be rejected. This is a common trade-off in simple rate limiter implementations and is noted here for awareness.
- The accuracy analysis claims (83-98% with 6 buckets) are mathematically sound: worst-case error is bounded by 1/num_buckets = 1/6 ~ 16.7%.
- All Redis commands used (`INCR`, `EXPIRE`, `MGET`, `DELETE`) are current and non-deprecated.
