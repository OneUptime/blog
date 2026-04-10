# Validation Summary: How to Use ZRANGEBYSCORE in Redis to Query by Score

## Status
validated

## Post Type
Tutorial / Command Reference

## Technologies Covered
- Redis (sorted sets)
- ZRANGEBYSCORE command
- ZREVRANGEBYSCORE command
- ZRANGE with BYSCORE (Redis 6.2+)

## Sources Consulted
- Redis official documentation for ZRANGEBYSCORE: https://redis.io/docs/latest/commands/zrangebyscore/
- Redis official documentation for ZRANGE: https://redis.io/docs/latest/commands/zrange/
- Redis official documentation for ZREVRANGEBYSCORE: https://redis.io/docs/latest/commands/zrevrangebyscore/
- Redis official documentation for ZADD: https://redis.io/docs/latest/commands/zadd/

## Issues Found

1. **Invalid `--` comment syntax in Redis code blocks.** Redis does not support `--` as a comment delimiter (that is SQL syntax). Two code blocks contained `--` comments that would cause errors if copy-pasted into redis-cli. Fixed by moving the comments outside the code blocks as plain text.
   - Affected sections: "Paginated Product Price Filter" and "ZRANGEBYSCORE vs ZREVRANGEBYSCORE".

2. **WITHSCORES and LIMIT in wrong order.** In the "Paginated Product Price Filter" example, the command was `ZRANGEBYSCORE products:price 0 19.99 LIMIT 0 2 WITHSCORES`, placing WITHSCORES after LIMIT. The documented syntax (including the post's own syntax section) specifies `[WITHSCORES] [LIMIT offset count]`. While Redis accepts either order in practice, this was inconsistent with the post's own documentation and could confuse readers. Fixed to `WITHSCORES LIMIT 0 2`.

3. **Misleading "constant offset cost" phrasing.** The performance section stated "LIMIT adds a constant offset cost," which implies O(1) overhead. In reality, the LIMIT offset incurs O(offset) cost because Redis must traverse and skip elements. Fixed to clarify that the cost is proportional to the offset.

## Review Notes
- All command outputs were verified against the setup data and are correct (member ordering, score values, inclusive/exclusive boundary behavior, pagination skip/count).
- The Redis 6.2+ deprecation note for ZRANGEBYSCORE in favor of `ZRANGE ... BYSCORE` is accurate and appropriately placed.
- The O(log N + M) time complexity claim is correct per Redis documentation.
- The ZREVRANGEBYSCORE comparison section correctly notes the reversed argument order (max before min).
- The use cases (time series, rate limiter, leaderboard, price filter, priority queue) are all technically sound patterns.
