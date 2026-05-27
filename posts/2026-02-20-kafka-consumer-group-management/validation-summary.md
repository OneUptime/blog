# Validation Summary: How to Manage Kafka Consumer Groups and Offsets

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Apache Kafka
- Kafka consumer groups
- Kafka offsets and consumer lag
- Kafka consumer group CLI
- Confluent Kafka Python client
- Python

## Sources Consulted
- Apache Kafka consumer configuration documentation: https://kafka.apache.org/42/configuration/consumer-configs/
- Apache Kafka basic operations documentation for `kafka-consumer-groups.sh`: https://kafka.apache.org/42/operations/basic-kafka-operations/
- Apache Kafka implementation documentation for consumer offset tracking: https://kafka.apache.org/42/implementation/distribution/
- Apache Kafka `KafkaConsumer` Javadocs for committed offset semantics: https://kafka.apache.org/36/javadoc/org/apache/kafka/clients/consumer/KafkaConsumer.html
- Confluent Kafka Python client overview and delivery guarantees: https://docs.confluent.io/kafka-clients/python/current/overview.html
- Confluent Kafka Python API documentation: https://docs.confluent.io/platform/current/clients/confluent-kafka-python/html/index.html
- Confluent consumer documentation for offset management: https://docs.confluent.io/platform/current/clients/consumer.html

## Issues Found
- The introduction said consumer groups guarantee each message is processed by exactly one consumer in the group. Kafka assigns each partition to one consumer in a group at a time, but processing exactly once is not guaranteed by consumer group membership alone. Updated the wording to describe partition assignment accurately.
- The offset explanation and diagram implied the committed offset is the last processed message offset. Kafka committed offsets conventionally represent the next message to consume. Updated the text and diagram to show a committed offset of 3 after processing offset 2.
- The auto-commit example only described duplicate delivery after a crash before the next commit. With the Confluent Python defaults, an offset can also be auto-committed before application processing finishes, which can skip the message after restart. Added that caveat in the code comment.
- The manual commit example performed a final commit in the `KeyboardInterrupt` handler. In Python, an interrupt can occur while processing a message, so committing unconditionally in the exception handler can commit work that has not completed. Removed that final unconditional commit to preserve at-least-once behavior.
- The rebalance section stated that no messages are delivered during a rebalance. This is too broad for cooperative rebalancing, where unaffected partitions can continue. Updated the wording to say some or all partitions may pause depending on the assignment strategy.
- The offset reset section omitted Kafka's requirement that consumer instances in the group be inactive before resetting offsets. Added that requirement before the reset commands.

## Review Notes
The examples use current Confluent Python consumer APIs and valid Kafka CLI options. The manual commit example intentionally favors at-least-once behavior, which can produce duplicates for processed-but-uncommitted records if the consumer exits before the next batch commit.
