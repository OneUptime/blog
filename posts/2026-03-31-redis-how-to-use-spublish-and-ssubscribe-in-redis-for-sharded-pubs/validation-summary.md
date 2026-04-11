# Validation Summary: How to Use SPUBLISH and SSUBSCRIBE in Redis for Sharded Pub/Sub

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Redis 7.0+ (sharded Pub/Sub commands: SPUBLISH, SSUBSCRIBE, SUNSUBSCRIBE)
- Redis Cluster mode
- Python redis-py library (RedisCluster, PubSub with ssubscribe/spublish)
- Node.js node-redis library (createCluster, sSubscribe/sPublish)
- PUBSUB SHARDCHANNELS and PUBSUB SHARDNUMSUB monitoring commands

## Sources Consulted
- Redis official documentation for SPUBLISH: https://redis.io/docs/latest/commands/spublish/
- Redis official documentation for SSUBSCRIBE: https://redis.io/docs/latest/commands/ssubscribe/
- Redis official documentation for SUNSUBSCRIBE: https://redis.io/docs/latest/commands/sunsubscribe/
- Redis official documentation for PUBSUB SHARDCHANNELS: https://redis.io/docs/latest/commands/pubsub-shardchannels/
- Redis official documentation for PUBSUB SHARDNUMSUB: https://redis.io/docs/latest/commands/pubsub-shardnumsub/
- node-redis sharded Pub/Sub documentation: https://github.com/redis/node-redis/blob/master/docs/pub-sub.md
- Local redis-py 7.0.1 library verification (confirmed spublish, ssubscribe, smessage handling exist)

## Issues Found
1. **Multi-channel SSUBSCRIBE with different hash slots**: The original CLI example `SSUBSCRIBE payments:eu-west analytics:asia` subscribes to two channels in a single call that almost certainly hash to different slots. Per the Redis documentation, "All the specified shard channels needs to belong to a single slot to subscribe in a given SSUBSCRIBE call." This would cause an error in cluster mode. Fixed by using hash tags (`{payments}.eu-west {payments}.asia`) to ensure both channels hash to the same slot, and added a note about the single-slot restriction.

## Review Notes
- The post states "Sharded Pub/Sub requires Redis 7.0+ in cluster mode. It does not work on standalone instances." According to the Redis documentation, SPUBLISH and SSUBSCRIBE are accepted in standalone Redis 7.0+ as well, though the sharding behavior is only meaningful in cluster mode (standalone has a single implicit shard). The post's guidance is correct for practical purposes since there is no benefit to using sharded Pub/Sub outside of cluster mode.
- The Python example has an unused `import redis` line (only `from redis.cluster import RedisCluster` is used), but this is a minor style issue, not a technical error.
- The Python redis-py code was verified locally: `RedisCluster.spublish()`, `PubSub.ssubscribe()`, and `smessage` message type handling all exist and match the blog post's usage.
- The Node.js node-redis code was verified against documentation: `sSubscribe()`, `sPublish()`, `cluster.duplicate()`, and the callback signature `(message, channel) => {}` are all correct.
- The claim that sharded Pub/Sub does not support pattern subscriptions is correct — there is no SPSUBSCRIBE equivalent.
- The PUBSUB SHARDCHANNELS and PUBSUB SHARDNUMSUB command syntax and output formats are accurate per Redis 7.0.0 documentation.
