# Validation Summary: How to Build a Social Graph with Redis Sets

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Redis (Sets: SADD, SREM, SMEMBERS, SCARD, SISMEMBER, SINTER, SUNIONSTORE, SINTERCARD)
- Python (redis-py client library)

## Sources Consulted
- redis-py source code (`redis/commands/core.py`) for `sintercard` method signature — confirmed `keys` parameter is typed `List[KeyT]`, not variadic `*args`
- Redis official command documentation for SADD, SREM, SMEMBERS, SCARD, SISMEMBER, SINTER, SUNIONSTORE, SINTERCARD — https://redis.io/docs/latest/commands/
- Redis official documentation for SINTERCARD (introduced in Redis 7.0) — https://redis.io/docs/latest/commands/sintercard/

## Issues Found
1. **Incorrect `sintercard` call signature (2 occurrences)**: The `keys` argument was passed as separate positional arguments instead of a list. In redis-py, `sintercard(numkeys, keys, limit=0)` expects `keys` to be a `List[KeyT]`. Passing two separate strings would assign the first string to `keys` (iterating over its characters) and the second string to `limit` (causing a TypeError).
   - **Line 89** (`mutual_friend_count`): Changed `r.sintercard(2, f"friends:{user_a}", f"friends:{user_b}")` to `r.sintercard(2, [f"friends:{user_a}", f"friends:{user_b}"])`.
   - **Line 101** (`people_you_may_know`): Changed `r.sintercard(2, f"friends:{user_id}", f"friends:{candidate}")` to `r.sintercard(2, [f"friends:{user_id}", f"friends:{candidate}"])`.

## Review Notes
- SINTERCARD requires Redis 7.0+. The post does not mention this version requirement. Readers on older Redis versions would get an error.
- The `friends_of_friends` function calls `srem` in a loop for each direct friend. A single `srem` call with all members (`r.srem(temp_key, user_id, *direct_friends)`) would be more efficient but the current code is functionally correct.
- The temp key in `friends_of_friends` is not wrapped in a try/finally, so if an error occurs mid-function the temp key would leak in Redis. Not a correctness issue but worth noting for production use.
