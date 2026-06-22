# Validation Summary: How to Fix 'UnknownTopicOrPartitionException' in Kafka

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Apache Kafka
- Kafka Java Admin API
- Kafka topic and partition management
- Kafka broker and topic configuration
- Java

## Sources Consulted
- Apache Kafka UnknownTopicOrPartitionException Javadoc: https://kafka.apache.org/41/javadoc/org/apache/kafka/common/errors/UnknownTopicOrPartitionException.html
- Apache Kafka Admin Javadoc: https://kafka.apache.org/41/javadoc/org/apache/kafka/clients/admin/Admin.html
- Apache Kafka AdminClient Javadoc: https://kafka.apache.org/41/javadoc/org/apache/kafka/clients/admin/AdminClient.html
- Apache Kafka NewTopic Javadoc: https://kafka.apache.org/41/javadoc/org/apache/kafka/clients/admin/NewTopic.html
- Apache Kafka topic configuration reference: https://kafka.apache.org/41/configuration/topic-configs/
- Apache Kafka broker configuration reference: https://kafka.apache.org/41/configuration/broker-configs/

## Issues Found
- The "Common Causes" diagram listed "Partition deleted", which is misleading because Kafka supports deleting topics and increasing partition counts, but not deleting individual partitions from an existing topic. Changed it to "Partition count mismatch".
- The Java examples used `AdminClient`. The class is not deprecated, but the current Kafka Javadoc says client code should prefer the newer `Admin` interface. Updated the examples to use `Admin.create(...)` and `Admin` fields/constructors.
- The topic creation example always set `min.insync.replicas` to `2`, even when the method could be called with replication factor `1`, which would make `acks=all` writes unable to satisfy the configured minimum ISR. Updated the example to set `min.insync.replicas` to `Math.min(2, replicationFactor)`.
- Updated one troubleshooting flowchart label from "Use AdminClient or CLI" to "Use Admin API or CLI" to match the corrected Java API usage.

## Review Notes
The remaining explanations align with Kafka's documented behavior: `UnknownTopicOrPartitionException` is retriable because metadata may be stale or the topic/partition may be created later, topic auto-creation is controlled by `auto.create.topics.enable`, and the topic configuration keys used in the example are valid Kafka topic configs.
