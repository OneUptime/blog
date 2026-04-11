# Validation Summary: How to Build a Live Auction System with Redis

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Redis (sorted sets, hashes, Pub/Sub, Lua scripting)
- Python (redis-py client library)
- ZADD, ZRANGE, HSET, HGET, PUBLISH commands
- cjson module within Redis Lua scripts

## Sources Consulted
- Redis ZRANGE documentation: https://redis.io/docs/latest/commands/zrange/
- Redis ZADD documentation: https://redis.io/docs/latest/commands/zadd/
- Redis HSET documentation: https://redis.io/docs/latest/commands/hset/
- Redis Pub/Sub documentation: https://redis.io/docs/latest/develop/interact/pubsub/
- Redis Lua scripting documentation: https://redis.io/docs/latest/develop/interact/programmability/eval-intro/
- redis-py documentation: https://redis-py.readthedocs.io/en/stable/

## Issues Found
1. **Bug in `get_top_bids` function**: The call `r.zrange(key, -count, -1, withscores=True, rev=True)` was incorrect. When `rev=True` is used, Redis traverses the sorted set from highest to lowest score, and negative indices `-count` to `-1` reference the tail of that reversed traversal — returning the **lowest** scoring elements, not the top bids. Fixed to `r.zrange(key, 0, count - 1, withscores=True, rev=True)`, which correctly returns the highest `count` bids in descending order.

## Review Notes
- The `close_auction` function is not atomic — there is a window between reading the winning bid and setting the status to "closed" where a new bid could theoretically be placed. The Lua script for placing bids does check the status field, but a concurrent bid could land in the gap. For a production system, closing should also use a Lua script. This is a design concern rather than a code error.
- The data model stores a `reserve` price field in the auction hash, but the bid placement Lua script never validates bids against it. A production system would typically reject bids below the reserve.
- The Pub/Sub listener uses the global `r` connection object, which works because `r.pubsub()` creates a dedicated connection. This is correct but worth noting for readers who might try to share a single connection.
