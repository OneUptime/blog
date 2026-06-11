# Validation Summary: How to Create Kafka Consumer Rebalance Listeners

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Apache Kafka consumer groups
- Kafka Java client
- `ConsumerRebalanceListener`
- Offset commits and manual offset management
- Cooperative sticky partition assignment
- Java unit testing with `MockConsumer`

## Sources Consulted
- Apache Kafka `ConsumerRebalanceListener` Javadocs: https://kafka.apache.org/32/javadoc/org/apache/kafka/clients/consumer/ConsumerRebalanceListener.html
- Apache Kafka `KafkaConsumer` Javadocs: https://kafka.apache.org/42/javadoc/org/apache/kafka/clients/consumer/KafkaConsumer.html
- Apache Kafka consumer configuration docs: https://kafka.apache.org/41/configuration/consumer-configs/
- Apache Kafka `MockConsumer` Javadocs: https://kafka.apache.org/31/javadoc/org/apache/kafka/clients/consumer/MockConsumer.html
- Apache Kafka upgrade notes for incremental cooperative rebalancing: https://kafka.apache.org/30/getting-started/upgrade/

## Issues Found
- The post described `ConsumerRebalanceListener` as having only two methods. Updated it to clarify that `onPartitionsRevoked` and `onPartitionsAssigned` are required callbacks and `onPartitionsLost` is a default callback in modern Kafka clients.
- The examples stored `KafkaConsumer<String, String>` in listener fields and constructors, but the test passes a `MockConsumer`, which implements `Consumer` rather than extending `KafkaConsumer`. Updated listener fields and constructors to use `Consumer<String, String>`.
- The "Why Rebalance Listeners Matter" table overstated guarantees around crashes, message loss, and exactly-once semantics. Reworded those rows to describe graceful revocation, duplicate reduction, and clean state/offset handoff accurately.
- The cooperative rebalancing section implied only that revoked partitions move to another consumer and did not mention the non-empty callback behavior. Updated it to match Kafka's cooperative rebalance callback semantics.
- The pitfalls section said `onPartitionsRevoked` may be called with an empty collection under cooperative rebalancing. Kafka's docs say cooperative `onPartitionsRevoked` is triggered only for non-empty revoked sets, while `onPartitionsAssigned` is always called after a successful rebalance and may be empty. Updated the pitfall and snippet accordingly.
- The auto-commit warning said to always disable auto-commit when using rebalance listeners. Narrowed it to manual offset management, which is the specific pattern used throughout the post.

## Review Notes
The remaining snippets are tutorial fragments and omit some surrounding imports or placeholder application classes such as `processRecord`, `PartitionState`, and `StateStore`; that is acceptable for the article format. For production code, consider committing offsets with leader epoch metadata as recommended by newer Kafka Javadocs.
