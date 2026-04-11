# Validation Summary: How to Use ZDIFFSTORE in Redis to Store Sorted Set Differences

## Status
validated

## Post Type
Tutorial / Command Reference

## Technologies Covered
- Redis (ZDIFFSTORE, ZDIFF, ZADD, ZRANGE commands; requires Redis 6.2+)
- Python redis-py client library

## Sources Consulted
- Redis official documentation for ZDIFFSTORE: https://redis.io/docs/latest/commands/zdiffstore/
- Redis official documentation for ZDIFF: https://redis.io/docs/latest/commands/zdiff/
- Redis official documentation for ZRANGE: https://redis.io/docs/latest/commands/zrange/
- redis-py source code (zdiffstore and zrange method signatures): https://github.com/redis/redis-py/blob/master/redis/commands/core.py

## Issues Found
1. **Incorrect redis-py `zdiffstore` call signature in all four Python examples.** The blog used `r.zdiffstore('dest', 2, 'key1', 'key2')`, passing `numkeys` and individual key arguments. The correct redis-py API is `r.zdiffstore('dest', ['key1', 'key2'])` — it accepts a list of keys and computes `numkeys` internally. Fixed all four occurrences:
   - "Find Users Who Didn't Complete a Step" example
   - "Content Recommendations - Exclude Already Seen" example
   - "Subscription Management - Find Unsubscribed Users" example
   - "Product Availability - Remove Out of Stock" example

## Review Notes
- The Redis CLI examples are all correct — `numkeys` is required in the raw Redis command syntax but is abstracted away by the redis-py client.
- ZDIFFSTORE was introduced in Redis 6.2.0. The post does not mention version requirements, which could be worth noting in a future update.
- All expected output values in comments are correct and consistent with the operations described.
- The `zrange` calls with `desc=True` and `withscores=True` are valid redis-py usage.
