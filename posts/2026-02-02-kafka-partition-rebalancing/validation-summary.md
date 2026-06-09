# Validation Summary: How to Handle Kafka Partition Rebalancing

## Status
validated

## Post Type
Tutorial / Guide — practical patterns for handling Kafka consumer group rebalances in Java and Python, with code samples, configuration recommendations, and troubleshooting tables.

## Technologies Covered
- Apache Kafka consumer groups (rebalance protocol, group coordinator, heartbeats)
- Apache Kafka Java client (`org.apache.kafka.clients.consumer.KafkaConsumer`, `ConsumerRebalanceListener`)
- Cooperative incremental rebalancing (`CooperativeStickyAssignor`, KIP-429)
- Static group membership (`group.instance.id`, KIP-345)
- confluent-kafka-python (`Consumer`, `on_assign` / `on_revoke` / `on_lost` callbacks)
- Micrometer (`MeterRegistry`, `Counter`, `Timer`, `Gauge`) for rebalance metrics
- Consumer tuning: `session.timeout.ms`, `heartbeat.interval.ms`, `max.poll.interval.ms`, `max.poll.records`, `enable.auto.commit`

## Sources Consulted
- Apache Kafka Consumer Configurations — https://kafka.apache.org/documentation/#consumerconfigs
- `ConsumerRebalanceListener` Javadoc (including `onPartitionsLost`) — https://kafka.apache.org/40/javadoc/org/apache/kafka/clients/consumer/ConsumerRebalanceListener.html
- `CooperativeStickyAssignor` Javadoc — https://kafka.apache.org/40/javadoc/org/apache/kafka/clients/consumer/CooperativeStickyAssignor.html
- KIP-429: Kafka Consumer Incremental Rebalance Protocol — https://cwiki.apache.org/confluence/display/KAFKA/KIP-429:+Kafka+Consumer+Incremental+Rebalance+Protocol
- KIP-345: Static Membership Protocol — https://cwiki.apache.org/confluence/display/KAFKA/KIP-345:+Introduce+static+membership+protocol+to+reduce+consumer+rebalances
- confluent-kafka-python `Consumer` reference — https://docs.confluent.io/platform/current/clients/confluent-kafka-python/html/index.html
- librdkafka `RebalanceCb` reference (authoritative for `incremental_assign`/`incremental_unassign` semantics) — https://docs.confluent.io/platform/current/clients/librdkafka/html/classRdKafka_1_1RebalanceCb.html
- confluent-kafka-python issue #1669 — documents the exact `_STATE` error when calling `assign()` with cooperative-sticky
- Micrometer Counter/Timer/Gauge docs — https://docs.micrometer.io/micrometer/reference/concepts.html

## Issues Found
- **Python sample used `consumer.assign()` with `cooperative-sticky` assignor.** The blog configured `partition.assignment.strategy: 'cooperative-sticky'` and then called `consumer.assign(partitions)` inside `on_assign`. librdkafka explicitly requires `incremental_assign()` / `incremental_unassign()` with cooperative assignors; calling `assign()` raises `KafkaError{_STATE}` "Erroneous state". Fixed by replacing the call with `consumer.incremental_assign(partitions)` and adding a one-line comment explaining why.

  No other code changes were needed — `on_revoke` and `on_lost` in the post don't call `unassign()`, so they correctly fall through to librdkafka's automatic incremental revoke behavior.

## Review Notes
- The Java samples are syntactically and API-correct against current Kafka client APIs: `ConsumerRebalanceListener` (with all three callbacks), `CooperativeStickyAssignor`, `GROUP_INSTANCE_ID_CONFIG`, `commitSync(Map)`, `commitSync(Duration)`, `pause`/`resume`, `seek`, and `consumer.metrics()` all match the published Javadocs.
- In `CooperativeRebalanceConsumer.commitPartitionOffset`, the comment says "Commit the current offset for a specific partition", but `consumer.commitSync(Duration)` actually commits *all* fetched offsets, not just the named partition. The behavior is still correct (it does commit the partition being revoked, among others), so this is a comment-clarity nit rather than a technical bug — left as-is to preserve the author's voice.
- `LongProcessingConsumer` mutates the caller-provided `Properties` object and constructs the `KafkaConsumer` without verifying that key/value deserializers were set by the caller. Typical for illustrative code; not flagged.
- Configuration defaults cited in the post match the current Kafka defaults (`session.timeout.ms=45000`, `max.poll.interval.ms=300000`, `max.poll.records=500`, `heartbeat.interval.ms=3000` default; the post's 15000 is a deliberate tuning recommendation and stays under 1/3 of the 45000 session timeout as required).
- The static-membership session timeout of 300000 ms in the example is below the broker default `group.max.session.timeout.ms` (1800000 ms in modern brokers), so it will be accepted.
- KIP-429 / cooperative rebalancing was introduced in Kafka 2.4 — the post's version claim is accurate.
- `onPartitionsLost` was also added as part of KIP-429 in 2.4; default behavior is to delegate to `onPartitionsRevoked`. The post correctly overrides it for the cooperative case.
