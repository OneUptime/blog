# Validation Summary: Top Redis Interview Questions for System Design

## Status
validated

## Post Type
Reference / Interview Preparation Guide

## Technologies Covered
- Redis (core data structures: Strings, Sorted Sets, Streams, Pub/Sub)
- Redis CLI commands (SET, DEL, ZADD, ZREMRANGEBYSCORE, ZCARD, EXPIRE, ZREVRANGE, ZREVRANK)
- Redis distributed locking (SET NX PX, Redlock)
- Redis Cluster (mentioned in summary)

## Sources Consulted
- Redis official command documentation: https://redis.io/docs/latest/commands/
- Redis SET command reference (EX, NX, PX flags): https://redis.io/docs/latest/commands/set/
- Redis ZADD command reference: https://redis.io/docs/latest/commands/zadd/
- Redis ZREVRANGE command reference: https://redis.io/docs/latest/commands/zrevrange/
- Redis ZREMRANGEBYSCORE command reference: https://redis.io/docs/latest/commands/zremrangebyscore/
- Redis Streams documentation: https://redis.io/docs/latest/develop/data-types/streams/
- Redis Pub/Sub documentation: https://redis.io/docs/latest/develop/interact/pubsub/
- Redis distributed locks (Redlock): https://redis.io/docs/latest/develop/use/patterns/distributed-locks/

## Issues Found
- **Summary inconsistency with post content**: The summary stated "Lua scripts for rate limiting" but the rate limiting section demonstrates a sorted set-based sliding window approach, not a Lua script approach. Changed to "sorted sets for leaderboards and rate limiting" to accurately reflect the post's content.

## Review Notes
- `ZREVRANGE` was deprecated in Redis 6.2.0 (February 2022) in favor of `ZRANGE key start stop REV WITHSCORES`. The command still works and is widely recognized in interview contexts, so it was not changed. Authors may wish to update to the modern syntax (`ZRANGE game:leaderboard 0 9 REV WITHSCORES`) in a future revision.
- All Redis commands shown are syntactically correct and would execute as described.
- The sliding window rate limiter pattern using sorted sets is a well-known and correct approach.
- The distributed lock section correctly describes the SET NX PX pattern and mentions Redlock for multi-node setups.
- The Pub/Sub vs Streams comparison accurately captures the key trade-offs (fire-and-forget vs persistent/replayable).
