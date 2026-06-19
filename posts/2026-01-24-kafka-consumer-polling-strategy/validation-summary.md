# Validation Summary: How to Handle Kafka Consumer Polling Strategy

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Apache Kafka consumers
- Kafka Java client
- Confluent Kafka Python client
- Kafka consumer polling and fetch configuration
- Kafka offset commits and consumer group behavior

## Sources Consulted
- Apache Kafka consumer configuration reference: https://kafka.apache.org/documentation/#consumerconfigs
- Apache Kafka `KafkaConsumer` JavaDoc: https://kafka.apache.org/25/javadoc/org/apache/kafka/clients/consumer/KafkaConsumer.html
- Confluent Kafka consumer configuration reference: https://docs.confluent.io/platform/current/installation/configuration/consumer-configs.html
- Confluent Kafka Python client API: https://docs.confluent.io/platform/current/clients/confluent-kafka-python/html/index.html
- librdkafka configuration reference: https://github.com/confluentinc/librdkafka/blob/master/CONFIGURATION.md

## Issues Found
- The polling sequence diagram implied that heartbeats are sent only after processing and that exceeding `max.poll.interval.ms` produces a `RebalanceInProgressException` heartbeat response. Updated it to describe the documented behavior: the consumer must call `poll()` within `max.poll.interval.ms`, otherwise it leaves the group and partitions are reassigned.
- The Java examples used manual `commitSync()` or `commitAsync()` calls while relying on the default `enable.auto.commit=true`. Added `enable.auto.commit=false` where examples commit offsets manually.
- The low-latency Java example claimed synchronous offset commits provide exactly-once semantics. Changed the comment to at-least-once delivery, because consumer offset commits alone do not provide exactly-once processing.
- The long-processing Java example used `TopicPartition` without importing `org.apache.kafka.common.TopicPartition`. Added the missing import.
- The Python `PollingConfig` exposed `max_poll_records`, but Confluent Python/librdkafka does not support Java's `max.poll.records` setting. Removed that field and its unused example assignment.
- The high-throughput configuration summary labeled `enable.auto.commit=true` as async commits, contradicting the Java example and Kafka offset commit semantics. Changed it to `enable.auto.commit=false` with manual async commits after processing.
- The low-latency configuration summary omitted `enable.auto.commit=false` even though the code manually commits after processing. Added the property.
- The monitoring Java example called `commitAsync()` but did not disable auto commits. Added `enable.auto.commit=false` in the constructor before creating the consumer.

## Review Notes
The remaining examples are illustrative and omit production concerns such as graceful shutdown with `wakeup()`, retry handling, per-partition ordering in threaded processing, and out-of-order offset tracking for asynchronous Python processing. These are important in production but not required to correct the polling strategy guidance.
