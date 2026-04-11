# Validation Summary: How to Use SORT in Redis to Sort Lists, Sets, and Sorted Sets

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Redis (SORT, SORT_RO commands)
- Python (redis-py client library)
- Node.js (node-redis v4 client library)

## Sources Consulted
- Official Redis SORT command documentation: https://redis.io/docs/latest/commands/sort/
- Official Redis SORT_RO command documentation: https://redis.io/docs/latest/commands/sort_ro/
- node-redis v4 source (SORT command types): https://github.com/redis/node-redis/blob/master/packages/client/lib/commands/SORT.ts
- redis-py documentation for the `sort()` method

## Issues Found
1. **Sorted Sets section: incorrect claim about default sorting behavior** — The example `SORT leaderboard` (without ALPHA) on members "alice", "bob", "charlie" had a comment stating it "sorts lexicographically by default since scores != values." This is wrong. SORT always defaults to numeric sorting, and running it on non-numeric string values without ALPHA produces `(error) ERR One or more scores can't be converted into double`. Fixed the comment to accurately describe the error behavior.

2. **Unused import in caching example** — The caching Python example imported `time` but never used it. Removed the unused import.

## Review Notes
- The SORT command syntax, BY/GET/LIMIT/STORE options, and all Redis CLI examples (apart from the fixed sorted set issue) are accurate.
- The Python redis-py API usage is correct: `sort()` with `by`, `get`, `alpha`, `store`, `start`, and `num` parameters all match the current API.
- The Node.js node-redis v4 API usage is correct: `DIRECTION`, `LIMIT`, `ALPHA`, and `lPush` with arrays are all valid per the v4 TypeScript types.
- The time complexity claim O(N+M*log(M)) matches official documentation.
- SORT_RO availability in Redis 7.0+ is confirmed.
- The Node.js example uses top-level `await` without an async wrapper, which is a common pattern in examples assuming ESM or an async IIFE context. This is acceptable for a tutorial.
