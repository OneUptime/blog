# Validation Summary: Back Off One Kafka Partition Without Pausing Healthy Partitions

## Status
validated

## Post Type
Technical guide

## Technologies Covered

- Apache Kafka 4.1 consumer API
- Java
- Kafka consumer groups and partition assignment
- Partition-level pause, resume, and seek operations
- Manual offset management
- Retry backoff and rebalance handling

## Sources Consulted

- Apache Kafka 4.1 `KafkaConsumer` API: https://kafka.apache.org/41/javadoc/org/apache/kafka/clients/consumer/KafkaConsumer.html
- Apache Kafka 4.1 consumer configuration: https://kafka.apache.org/41/generated/consumer_config.html
- Apache Kafka 4.1 `ConsumerRebalanceListener` API: https://kafka.apache.org/41/javadoc/org/apache/kafka/clients/consumer/ConsumerRebalanceListener.html
- Apache Kafka 4.1 `ConsumerRecords` API: https://kafka.apache.org/41/javadoc/org/apache/kafka/clients/consumer/ConsumerRecords.html
- Apache Kafka 4.1 `ConsumerRecord` API: https://kafka.apache.org/41/javadoc/org/apache/kafka/clients/consumer/ConsumerRecord.html
- Apache Kafka 4.1 `OffsetAndMetadata` API: https://kafka.apache.org/41/javadoc/org/apache/kafka/clients/consumer/OffsetAndMetadata.html
- Apache Kafka 4.1 `TopicPartition` API: https://kafka.apache.org/41/javadoc/org/apache/kafka/common/TopicPartition.html
- Apache Kafka compatibility documentation: https://kafka.apache.org/41/getting-started/compatibility/
- Oracle Java `System.nanoTime()` API: https://docs.oracle.com/en/java/javase/25/docs/api/java.base/java/lang/System.html#nanoTime()
- Apache Kafka downloads and supported releases: https://kafka.apache.org/community/downloads/

## Issues Found

- The retry deadline used `deadline <= now`, which is unsafe when `System.nanoTime()` wraps. Changed the due check to subtraction-based comparison, as recommended by the Java API, and replaced the incorrect saturating-arithmetic advice with guidance to cap backoff delays.
- The post said the loop polls every 100 milliseconds, but `Duration.ofMillis(100)` is the ordinary maximum blocking time for each `poll` call, not its invocation cadence. Clarified that processing, synchronous commits, and rebalance callbacks also affect the interval between calls.
- The manual commit constructed `OffsetAndMetadata` without the consumed record's leader epoch. The one-argument constructor is valid, but Kafka 4.1 recommends including the leader epoch so log truncation can be detected. Updated the example to pass `record.leaderEpoch()`.
- The rebalance guidance did not cover partitions reported through `onPartitionsLost`, for which ownership may already have moved and committing is unsafe. Added cleanup and fencing guidance without a commit.
- The assignment guidance could lead an implementation to reapply pauses only to the collection passed to `onPartitionsAssigned`, even though that collection excludes previously owned partitions. Clarified that active pauses must be reapplied across the current assignment.
- The scheduler guidance mentioned `wakeup()` without explaining that it raises `WakeupException` in the current or next interruptible consumer call. Added the required catch, command-drain, and continue behavior for non-shutdown wakeups.

## Review Notes

- All referenced URLs resolved to the intended official resources. The `/41/` API pages served Kafka client 4.1.2 documentation on the validation date, and the Kafka 4.1 release line remained supported.
- All Kafka APIs used by the corrected snippet are current and non-deprecated in Kafka 4.1.2.
- The snippet uses `Set.of`, which is compatible with Kafka 4.x's Java 11-or-later requirement.
