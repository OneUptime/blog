# Validation Summary: How to Use PUBSUB NUMSUB in Redis to Count Channel Subscribers

## Status
validated

## Post Type
Tutorial / Reference

## Technologies Covered
- Redis (PUBSUB NUMSUB, PUBSUB CHANNELS, PUBSUB NUMPAT commands)
- Python (redis-py client library)
- Node.js (node-redis v4+ client library)
- Go (go-redis/v9 client library)
- Bash (redis-cli monitoring script)

## Sources Consulted
- Redis official documentation for PUBSUB NUMSUB: https://redis.io/docs/latest/commands/pubsub-numsub/
- Redis official documentation for PUBSUB NUMPAT: https://redis.io/docs/latest/commands/pubsub-numpat/
- Redis official documentation for PUBSUB CHANNELS: https://redis.io/docs/latest/commands/pubsub-channels/
- redis-py source code (redis/commands/core.py, redis/_parsers/helpers.py): https://github.com/redis/redis-py
- node-redis source code (packages/client/lib/commands/PUBSUB_NUMSUB.ts): https://github.com/redis/node-redis
- go-redis v9 source code and pkg.go.dev documentation: https://pkg.go.dev/github.com/redis/go-redis/v9

## Issues Found
1. **Node.js example used incorrect spread syntax for `pubSubNumSub`**: The blog used `client.pubSubNumSub(...channels)` which spreads the array into multiple positional arguments. However, `pubSubNumSub` in node-redis v4+ accepts a single `RedisVariadicArgument` parameter (a string or an array of strings), not variadic arguments. Fixed to `client.pubSubNumSub(channels)` which passes the array directly.

## Review Notes
- The Redis command syntax, return format, and behavioral descriptions are all accurate per official Redis documentation.
- The Python redis-py example is correct: `pubsub_numsub(*channels)` accepts variadic `*args` and returns a list of `(channel, count)` tuples.
- The Go go-redis/v9 example is correct: `PubSubNumSub(ctx, channels...).Result()` returns `(map[string]int64, error)` and the range iteration is valid.
- The explanation that PUBSUB NUMSUB only counts direct SUBSCRIBE subscribers (not PSUBSCRIBE pattern subscribers) is accurate per official docs.
- The bash monitoring script is straightforward and correct.
- Minor note: PUBSUB NUMPAT returns the count of unique patterns subscribed to, not the count of clients with pattern subscriptions. The blog's phrasing ("total number of pattern subscriptions") is close but could be more precise for advanced readers.
