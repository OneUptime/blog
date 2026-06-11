# Validation Summary: How to Build Kafka Custom Partitioners

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Apache Kafka producer partitioning
- Kafka custom `Partitioner` implementations
- Java
- Kafka producer configuration
- Kafka cluster metadata APIs

## Sources Consulted
- Apache Kafka `Partitioner` source: https://raw.githubusercontent.com/apache/kafka/trunk/clients/src/main/java/org/apache/kafka/clients/producer/Partitioner.java
- Apache Kafka `ProducerConfig` source: https://github.com/apache/kafka/blob/trunk/clients/src/main/java/org/apache/kafka/clients/producer/ProducerConfig.java
- Apache Kafka `Cluster` source: https://raw.githubusercontent.com/apache/kafka/trunk/clients/src/main/java/org/apache/kafka/common/Cluster.java
- Apache Kafka `BuiltInPartitioner` source: https://raw.githubusercontent.com/apache/kafka/trunk/clients/src/main/java/org/apache/kafka/clients/producer/internals/BuiltInPartitioner.java
- Apache Kafka `KafkaProducer` Javadoc: https://docs.confluent.io/platform/current/clients/javadocs/javadoc/org/apache/kafka/clients/producer/KafkaProducer.html

## Issues Found
- The priority partitioner used `Math.abs(hashCode) % partitionCount`, which can produce a negative partition for `Integer.MIN_VALUE`. Replaced the partition math with `Math.floorMod`.
- The priority partitioner comment promised round-robin behavior for null keys, but the code used `Math.random`. Replaced this with a thread-safe `AtomicInteger` counter over normal partitions.
- The priority partitioner could divide by zero or return invalid partitions when the reserved high-priority count was greater than or equal to the topic partition count. Added validation before routing.
- The geographic and weighted partitioners assigned `cluster.partitionCountForTopic(topic)` directly to `int`, but Kafka's `Cluster` API returns `Integer` and can return `null` when metadata is unavailable. Added null and zero checks.
- The geographic partitioner used modulo fallback when a configured region range exceeded the topic partition count, which could route data into the wrong region range. Changed this to fail fast with a clear exception.
- The geographic partitioner also used `Math.abs(hashCode) % partitionCount`; changed it to `Math.floorMod` to avoid negative partitions.
- The weighted partitioner calculated its random range using weights for partitions that might not exist in the current topic, which could bias traffic toward the fallback partition. Changed the random range to include only usable partitions.
- The weighted partitioner accepted zero or negative weights. Added validation so configured weights are positive.

## Review Notes
The examples remain simplified tutorial code. In production, teams should also decide whether custom partitioners should use only available partitions, emit custom metrics, and validate key types and topic-specific partition counts during startup.
