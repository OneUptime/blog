# Validation Summary: How to Use SSUBSCRIBE and SUNSUBSCRIBE in Redis Sharded Pub/Sub

## Status
validated

## Post Type
Tutorial / Reference Guide

## Technologies Covered
- Redis 7.0+ (Sharded Pub/Sub)
- SSUBSCRIBE command
- SUNSUBSCRIBE command
- SPUBLISH command
- PUBSUB SHARDCHANNELS subcommand
- PUBSUB SHARDNUMSUB subcommand
- Redis Cluster

## Sources Consulted
- Redis official documentation for SSUBSCRIBE: https://redis.io/docs/latest/commands/ssubscribe/
- Redis official documentation for SUNSUBSCRIBE: https://redis.io/docs/latest/commands/sunsubscribe/
- Redis official documentation for SPUBLISH: https://redis.io/docs/latest/commands/spublish/
- Redis official documentation for PUBSUB SHARDCHANNELS: https://redis.io/docs/latest/commands/pubsub-shardchannels/
- Redis official documentation for PUBSUB SHARDNUMSUB: https://redis.io/docs/latest/commands/pubsub-shardnumsub/

## Issues Found
No technical issues found.

## Review Notes
- The post correctly notes that all sharded Pub/Sub commands require Redis 7.0+. All five commands (SSUBSCRIBE, SUNSUBSCRIBE, SPUBLISH, PUBSUB SHARDCHANNELS, PUBSUB SHARDNUMSUB) were introduced in Redis 7.0.0.
- The SSUBSCRIBE syntax, response formats (ssubscribe confirmation, smessage delivery), and SUNSUBSCRIBE behavior (including no-argument unsubscribe-all) are all accurate per official docs.
- The comparison table correctly states that sharded Pub/Sub does not support pattern matching — there is no SPSUBSCRIBE equivalent.
- One nuance not mentioned in the post: all shard channels specified in a single SSUBSCRIBE call must belong to the same hash slot. Subscribing to channels in different slots requires separate SSUBSCRIBE calls. This is not an error in the post, just an additional detail that advanced users may want to know.
- The SPUBLISH return value description ("number of subscribers on the local shard") is accurate — in cluster mode, the count reflects only clients connected to the same node as the publisher.
