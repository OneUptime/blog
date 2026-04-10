# Validation Summary: Redis vs Kafka for Message Queuing

## Status
validated

## Post Type
Comparison / Reference Guide

## Technologies Covered
- Redis (Pub/Sub and Streams)
- Apache Kafka
- BullMQ (mentioned as a Redis Streams consumer)

## Sources Consulted
- Redis Streams documentation: https://redis.io/docs/data-types/streams/
- Redis Pub/Sub documentation: https://redis.io/docs/interact/pubsub/
- Redis XADD command reference: https://redis.io/commands/xadd/
- Redis XREADGROUP command reference: https://redis.io/commands/xreadgroup/
- Redis XGROUP CREATE command reference: https://redis.io/commands/xgroup-create/
- Apache Kafka documentation (kafka-topics.sh): https://kafka.apache.org/documentation/#topicconfigs
- Apache Kafka CLI tools reference: https://kafka.apache.org/documentation/#basic_ops
- BullMQ architecture documentation: https://docs.bullmq.io/

## Issues Found
1. **Missing `--bootstrap-server` flag in `kafka-topics.sh` command**: The `kafka-topics.sh --create` command was missing the required `--bootstrap-server localhost:9092` flag. In Kafka 3.x+ (KRaft mode, which is now the default), `--bootstrap-server` is mandatory for all CLI admin commands since ZooKeeper support has been removed. Even in Kafka 2.2+, `--bootstrap-server` was the recommended approach over the deprecated `--zookeeper` flag. Without this flag, the command would fail with an error. Added `--bootstrap-server localhost:9092` to the command.

## Review Notes
- The throughput figures in the comparison table (~100K msg/sec for Redis, millions msg/sec for Kafka) are reasonable ballpark numbers but will vary significantly depending on message size, hardware, configuration, and workload patterns. These are acceptable for a high-level comparison.
- The claim that BullMQ uses Redis Streams is broadly correct — BullMQ leverages Redis Streams as part of its architecture (particularly for its event system), though it also uses other Redis data structures (lists, sorted sets, hashes) for the core queue mechanism.
- The post correctly notes that Redis Pub/Sub messages are not stored and are lost if subscribers are offline.
- Redis Streams retention is described as "bounded by memory" in the table, which is accurate. It's worth noting that Redis Streams also support explicit trimming via MAXLEN and MINID strategies, but this is a detail beyond the scope of a comparison post.
- Kafka's `retention.ms=604800000` correctly calculates to 7 days (7 * 24 * 60 * 60 * 1000).
