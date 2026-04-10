# Validation Summary: How to Build a Social Media Follow/Follower System with Redis

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Redis (Sets data structure)
- Python (redis-py client library)
- Redis commands: SADD, SREM, SISMEMBER, SCARD, SINTER, SDIFF, SSCAN
- Redis pipelines/transactions

## Sources Consulted
- Redis SADD documentation: https://redis.io/docs/latest/commands/sadd/
- Redis SREM documentation: https://redis.io/docs/latest/commands/srem/
- Redis SISMEMBER documentation: https://redis.io/docs/latest/commands/sismember/
- Redis SCARD documentation: https://redis.io/docs/latest/commands/scard/
- Redis SINTER documentation: https://redis.io/docs/latest/commands/sinter/
- Redis SDIFF documentation: https://redis.io/docs/latest/commands/sdiff/
- Redis SSCAN documentation: https://redis.io/docs/latest/commands/sscan/
- redis-py pipelines and transactions: https://redis.io/docs/latest/develop/clients/redis-py/transpipe/

## Issues Found

### 1. `suggested_users` function returns the user themselves in suggestions
**What was wrong:** The `suggested_users("bob", "alice")` example claimed the output would be `{'carol'}`, but the actual output would be `{'bob', 'carol'}`. The SDIFF of `following:alice` minus `following:bob` includes "bob" (since "bob" is in alice's following set but not in bob's own following set), meaning the function would suggest that bob follow himself.

**What was changed:** Added `suggestions.discard(user_id)` to the `suggested_users` function to remove the user from their own suggestions, making the example output `{'carol'}` correct.

**Why:** SDIFF returns all members of the first set not present in the second set. Since a user isn't typically in their own following set, they would appear in the diff. The fix ensures the function works correctly for the stated purpose of suggesting new users to follow.

## Review Notes
- The post states "Using a pipeline ensures both sets are updated atomically in a single round trip." In redis-py, `pipeline()` defaults to `transaction=True`, which wraps commands in MULTI/EXEC — so the code is indeed atomic. However, this is a redis-py-specific default behavior, not a property of Redis pipelines in general. The distinction could matter if readers apply this knowledge to other Redis clients where pipelines don't default to transactional mode.
- The O(1) complexity claims for follow/unfollow are correct since each SADD/SREM call operates on a single member. SINTER and SDIFF have higher complexities (O(N*M) and O(N) respectively) which the post doesn't mention — worth noting for users with very large following sets.
- All redis-py method names and signatures are correct and current.
