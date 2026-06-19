# Validation Summary: How to Design Topic Partition Strategies in Kafka

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Apache Kafka
- Kafka producer partitioning
- Kafka custom partitioners
- Kafka consumer partition assignment
- Java Kafka client APIs
- Kafka command-line topic management

## Sources Consulted
- Apache Kafka Producer Configs: https://kafka.apache.org/41/configuration/producer-configs/
- Apache Kafka Consumer Configs: https://kafka.apache.org/41/configuration/consumer-configs/
- Apache Kafka Partitioner interface source: https://github.com/apache/kafka/blob/trunk/clients/src/main/java/org/apache/kafka/clients/producer/Partitioner.java
- Apache Kafka Basic Kafka Operations: https://kafka.apache.org/43/operations/basic-kafka-operations/
- Apache Kafka Introduction: https://kafka.apache.org/intro/
- Apache Kafka Producer Metrics: https://kafka.apache.org/32/generated/producer_metrics.html

## Issues Found
- The post described default no-key producer partitioning as round-robin. Current Kafka producer documentation describes sticky partitioning for records without an explicit partition or key, so the text and diagram were updated.
- The custom partitioner examples used `Math.abs(hashCode()) % partitions`, which can still produce a negative value for `Integer.MIN_VALUE`. Updated these calculations to use `Math.floorMod`.
- The geographic custom partitioner implemented `Partitioner` but omitted required `close()` and `configure(...)` methods. Added no-op implementations.
- The composite-key example implied ordering by event time. Kafka preserves append order within a partition, not event-time sorting, so the comments were corrected.
- The priority partitioner could divide by zero when used with a one-partition topic. Added a guard that returns partition 0 when only one partition exists.
- The hot-partition detection example tried to read `record-send-rate` metrics with a `partition` tag. Kafka producer metrics expose producer-level and topic-level record send rates, not a documented per-partition producer metric with that tag. Replaced the snippet with callback-based tracking using `RecordMetadata.partition()`.
- The partition-count guidance gave a fixed `~1MB` broker memory overhead per partition. Reworded it to the more generally accurate statement that each partition adds broker metadata and memory overhead.
- The best-practice wording warned against "high cardinality skew." Reworded it to warn against skewed keys that concentrate traffic.

## Review Notes
The post is technically relevant and accurate after the fixes. The examples remain illustrative snippets and assume surrounding imports, producer fields, serializers, and domain model classes are provided by the application.
