# Validation Summary: How to Implement Real-Time Fraud Detection with Redis

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Redis (sorted sets, hashes, pub/sub, pipelines)
- Python (redis-py client library)
- Sliding window rate limiting pattern
- Welford's online mean algorithm for running average

## Sources Consulted
- Redis official documentation for sorted set commands: ZADD, ZCARD, ZCOUNT, ZREMRANGEBYSCORE (https://redis.io/docs/latest/commands/)
- Redis official documentation for HSET, HGETALL, SET, EXISTS, EXPIRE, PUBLISH (https://redis.io/docs/latest/commands/)
- redis-py library documentation for pipeline and command API (https://redis-py.readthedocs.io/en/stable/)
- Welford's online algorithm for computing running mean (https://en.wikipedia.org/wiki/Algorithms_for_calculating_variance#Welford's_online_algorithm)

## Issues Found
- **`unique_countries` check used `zcard` instead of `zcount` with time range (line 140):** The `calculate_fraud_score` function used `r.zcard(f"fraud:countries:{user_id}")` to count unique countries, which returns the total number of members in the sorted set regardless of their score/timestamp. However, the `unique_countries` rule defines a window of 86400 seconds (1 day) and the key TTL is set to 172800 seconds (2 days). This meant countries seen between 1-2 days ago would still be counted, producing false positives. Fixed by changing to `r.zcount()` with `now - 86400` to `now` range, consistent with all other time-windowed checks in the function.

## Review Notes
- The `check_velocity` utility function only works correctly for rules whose data is stored under the `fraud:velocity:{user_id}:{rule_name}` key pattern (i.e., `tx_per_minute`, `tx_per_hour`, `failed_attempts`). It would not work for `unique_merchants` or `unique_countries` which use different key patterns. This is not a bug since `calculate_fraud_score` handles those checks inline, but it's a design inconsistency worth noting.
- The `amount_per_hour` rule is defined in the RULES dict but never checked in `calculate_fraud_score`. The amount-based fraud check uses a different approach (comparing against user average * 5) rather than summing amounts in a window.
- The `evaluate_transaction` function does not call `record_transaction_event` or `update_user_profile` — the caller would need to invoke these separately. This is acceptable for a tutorial but worth noting.
- The summary's claim that the fraud score is computed "atomically" is slightly imprecise — `calculate_fraud_score` makes multiple individual Redis calls rather than using a MULTI/EXEC transaction or Lua script. Under high concurrency, the score could be based on a slightly inconsistent snapshot. For a blog post this is acceptable, but production systems would want to use a Lua script for true atomicity.
- The running average formula in `update_user_profile` (Welford's method) is correct and numerically stable.
