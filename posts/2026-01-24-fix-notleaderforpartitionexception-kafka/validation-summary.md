# Validation Summary: How to Fix 'NotLeaderForPartitionException' in Kafka

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Apache Kafka
- Kafka Java producer
- Kafka Java consumer
- Java client configuration

## Sources Consulted
- Apache Kafka Producer Configuration Reference: https://kafka.apache.org/41/configuration/producer-configs/
- Apache Kafka Consumer Configuration Reference: https://kafka.apache.org/41/configuration/consumer-configs/
- Apache Kafka 3.3.2 Javadocs for `NotLeaderForPartitionException`: https://kafka.apache.org/33/javadoc/org/apache/kafka/common/errors/NotLeaderForPartitionException.html

## Issues Found
- The post recommended setting producer `retries` to at least 3 and the sample code set `ProducerConfig.RETRIES_CONFIG` to `3`. Current Kafka producer documentation states that `retries` defaults to `2147483647` and that users should generally prefer using `delivery.timeout.ms` to control retry behavior. I changed the sample to keep retries enabled with `Integer.MAX_VALUE` and updated the best-practice text to recommend a default or suitably high retry count bounded by `delivery.timeout.ms`.
- The post described `NotLeaderForPartitionException` without noting that the Java client deprecated it in Kafka 2.6 in favor of `NotLeaderOrFollowerException`. I added a short compatibility note while keeping the original troubleshooting focus intact.

## Review Notes
The producer and consumer configuration keys used in the examples are valid current Kafka client configuration constants. The consumer heartbeat guidance is correct for the classic consumer group protocol; in newer Kafka clients using `group.protocol=consumer`, heartbeat and session timing are broker-controlled instead.
