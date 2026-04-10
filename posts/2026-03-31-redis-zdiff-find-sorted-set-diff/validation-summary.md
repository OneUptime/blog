# Validation Summary: How to Use ZDIFF in Redis to Find Sorted Set Differences

## Status
validated

## Post Type
Tutorial / Command Reference

## Technologies Covered
- Redis (6.2+)
- Redis Sorted Sets
- ZDIFF command
- ZDIFFSTORE command

## Sources Consulted
- Official Redis ZDIFF documentation: https://redis.io/docs/latest/commands/zdiff/
- Official Redis ZDIFFSTORE documentation: https://redis.io/docs/latest/commands/zdiffstore/

## Issues Found
1. **Time complexity logarithmic term was incorrect.** The post stated `O(L + (N-K) log(N-K))` but the official Redis documentation specifies `O(L + (N-K) log(N))` — the logarithmic term is `log(N)`, not `log(N-K)`. Additionally, K was described as "the number of elements removed" but the official docs define K as "the size of the result set." Fixed both in the Time Complexity section.

## Review Notes
- The post correctly covers syntax, basic usage, multi-set differences, WITHSCORES behavior, missing key handling, and the numkeys mismatch error.
- All code examples produce the expected output and use correct ZADD/ZDIFF syntax.
- The ZDIFF vs ZDIFFSTORE comparison table is accurate.
- The "Available since Redis 6.2" claim is accurate (precisely 6.2.0).
- The error behavior for numkeys mismatch (`ERR syntax error`) is empirically correct but not formally documented in Redis docs; this is a minor observation and not an error in the post.
