# Validation Summary: How to Build a Mutual Friends Finder with Redis

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Redis (SINTER, SINTERCARD, SINTERSTORE, SADD, SMEMBERS, EXPIRE, EXISTS)
- Python (redis-py client library)
- Redis Pipelining

## Sources Consulted
- redis-py source code (`redis.commands.core.SetCommands.sintercard` and `sinter` method signatures verified via installed package)
- Redis official documentation for SINTER: https://redis.io/docs/latest/commands/sinter/
- Redis official documentation for SINTERCARD: https://redis.io/docs/latest/commands/sintercard/
- Redis official documentation for SINTERSTORE: https://redis.io/docs/latest/commands/sinterstore/

## Issues Found

### 1. `sintercard` called with incorrect argument format (3 occurrences)
**What was wrong:** `r.sintercard(2, f"friends:{user_a}", f"friends:{user_b}")` passes keys as separate positional arguments. In redis-py, `sintercard` expects `keys` as a `List` (second parameter), not as variadic args. Passing two strings would assign the first string to `keys` (iterating its characters) and the second string to `limit` (causing a type error).

**What was changed:** Wrapped the key arguments in a list: `r.sintercard(2, [f"friends:{user_a}", f"friends:{user_b}"])`. Fixed in three locations: `count_mutual_friends`, `batch_mutual_counts`, and `people_you_may_know`.

**Why:** Verified against the installed redis-py source — `sintercard(self, numkeys: int, keys: List[KeyT], limit: int = 0)` unpacks `keys` with `*keys`, so a string would be character-iterated. Note that `sinter` uses `list_or_args()` which tolerates both forms, but `sintercard` does not.

### 2. Incorrect time complexity in description
**What was wrong:** The description stated "O(N) time" for SINTER operations.

**What was changed:** Corrected to "O(N*M) time" to match the actual Redis SINTER complexity (where N is the cardinality of the smallest set and M is the number of sets), consistent with what the post's own Summary section already stated.

**Why:** The Redis documentation specifies O(N*M) worst case complexity for SINTER.

## Review Notes
- The `cached_mutual_friends` function has a minor TOCTOU (time-of-check-time-of-use) race between `r.exists(cache_key)` and `r.sinterstore()`/`r.expire()`. In a concurrent environment, two requests could both find the key missing and both write. This is functionally harmless (same result written twice) but worth noting. A production implementation might use a Lua script or `SET NX` guard.
- The `people_you_may_know` function fetches all friends-of-friends in a loop with individual `SMEMBERS` calls, which could be slow for users with many friends. A pipeline or SUNIONSTORE approach would be more efficient. This is an optimization concern, not a correctness issue.
- The `sinter` method in redis-py uses `list_or_args()` which accepts both `r.sinter("key1", "key2")` and `r.sinter(["key1", "key2"])`, so the `sinter` calls in the post are correct as-is.
