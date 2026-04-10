# Validation Summary: How to Build a Relative Leaderboard (Friends Only) with Redis

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Redis (Sorted Sets, Sets, Pipelines, ZINTERSTORE, ZREVRANK)
- Python (redis-py client library)

## Sources Consulted
- Redis ZADD documentation: https://redis.io/commands/zadd
- Redis ZINTERSTORE documentation: https://redis.io/commands/zinterstore
- Redis ZREVRANGE documentation: https://redis.io/commands/zrevrange
- Redis ZREVRANK documentation: https://redis.io/commands/zrevrank
- Redis SUNIONSTORE documentation: https://redis.io/commands/sunionstore
- Redis SMEMBERS documentation: https://redis.io/commands/smembers
- redis-py documentation: https://redis-py.readthedocs.io/

## Issues Found

1. **Unused `import time`**: The `import time` statement in the "Building the Friend Leaderboard" section was never used. Removed it.

2. **Pipeline anti-pattern in `get_friends_leaderboard`**: The original code called `r.zscore()` individually for each friend (N separate round-trips) outside the pipeline, while only the `zadd` calls were pipelined. Fixed to pipeline all `zscore` calls together in a separate pipeline, reducing round-trips from N+2 to 3.

3. **Missing temp key cleanup**: Neither `get_friends_leaderboard` nor `get_friends_leaderboard_v2` deleted the temporary sorted set key before repopulating it. If a friend was removed between calls within the TTL window, stale entries would persist. Added `pipe.delete(temp_key)` before repopulating.

4. **"Efficient ZINTERSTORE Approach" did not use ZINTERSTORE**: The section title and description promised a ZINTERSTORE-based approach, but the code was essentially identical to v1 — fetching scores individually and adding them to a temp sorted set. Also incorrectly referred to a "friends bitmap" when it's a Set. Rewrote the code to actually use `ZINTERSTORE` with the global leaderboard and a temporary friends Set (using `WEIGHTS 1 0` to keep only leaderboard scores). This is the idiomatic Redis approach and executes entirely server-side in a single pipeline.

5. **`get_friend_rank` limited to top 20**: The function called `get_friends_leaderboard(user_id)` with the default `n=20`, so any user ranked below 20th among friends would incorrectly get `-1`. Replaced with `ZREVRANK` on the cached temp key, which returns the correct rank regardless of friend count.

## Review Notes
- The Data Model section (SADD, SREM, ZADD) is correct and idiomatic.
- The `ZINTERSTORE` approach treats regular Set members as having score 1; using `WEIGHTS 0` for the friends key zeroes them out so only the leaderboard scores remain in the result. This is documented Redis behavior.
- The monitoring bash command `redis-cli SMEMBERS friends:user_123 | wc -l` works but `SCARD` would be more efficient for just getting the count. Not changed since it's not incorrect.
- For very large friend lists (1000+), the summary's suggestion to pre-compute asynchronously is sound advice.
