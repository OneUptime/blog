# Validation Summary: How to Use Sharded Pub/Sub in Redis 7.0+

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Redis 7.0+ (Sharded Pub/Sub: SSUBSCRIBE, SPUBLISH, SUNSUBSCRIBE)
- Redis Cluster
- redis-py (Python Redis client)
- ioredis (Node.js Redis client)
- redis-cli

## Sources Consulted
- Redis official documentation for SSUBSCRIBE: https://redis.io/docs/latest/commands/ssubscribe/
- Redis official documentation for SPUBLISH: https://redis.io/docs/latest/commands/spublish/
- Redis official documentation for PUBSUB SHARDCHANNELS: https://redis.io/docs/latest/commands/pubsub-shardchannels/
- Redis official documentation for PUBSUB SHARDNUMSUB: https://redis.io/docs/latest/commands/pubsub-shardnumsub/
- redis-py documentation for cluster support: https://redis-py.readthedocs.io/en/stable/clustering.html
- ioredis GitHub repository: https://github.com/redis/ioredis

## Issues Found
1. **Python subscriber used pattern-like channel name (Step 4)**: The code `pubsub.ssubscribe('orders:*')` subscribed to a literal channel named `orders:*`, not a wildcard pattern. Since sharded Pub/Sub does not support pattern subscriptions, this would subscribe to a single channel with the literal name `orders:*`, which would never receive messages from the publisher (which publishes to channels like `orders:0` through `orders:99`). Fixed by changing to `pubsub.ssubscribe('orders:42')` with a clarified comment, making the example consistent with the publisher and with the post's own note that pattern matching is not supported.

## Review Notes
- The PUBSUB SHARDCHANNELS and PUBSUB SHARDNUMSUB commands return information for the specific node they are executed on, not cluster-wide aggregated data. The post's description ("Returns all active sharded channel names") is slightly ambiguous but not incorrect in the single-node context.
- The SSUBSCRIBE command requires that all channels in a single call belong to the same hash slot. The post does not mention this constraint, which could surprise users trying to subscribe to multiple channels at once.
- The ioredis example (Step 8) requires ioredis >= 5.9.0 for working sharded Pub/Sub support on Cluster connections. Earlier versions had routing issues. The post does not mention a minimum version requirement.
- All Redis commands (SSUBSCRIBE, SPUBLISH, PUBSUB SHARDCHANNELS, PUBSUB SHARDNUMSUB) are confirmed real, correctly named, and introduced in Redis 7.0.0.
- The comparison table and explanations of classic vs. sharded Pub/Sub behavior are accurate.
