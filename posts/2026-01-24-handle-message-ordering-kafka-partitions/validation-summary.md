# Validation Summary: How to Handle Message Ordering in Kafka Partitions

## Status
validated

## Post Type
Technical guide / tutorial

## Technologies Covered
- Apache Kafka
- Kafka producers and consumers
- Kafka partitions and partition keys
- Kafka consumer groups and offset commits
- Kafka idempotent producer configuration
- Java Kafka client APIs

## Sources Consulted
- Apache Kafka Producer Configuration Reference: https://kafka.apache.org/41/configuration/producer-configs/
- Apache Kafka `Partitioner` interface source/Javadoc: https://github.com/apache/kafka/blob/trunk/clients/src/main/java/org/apache/kafka/clients/producer/Partitioner.java
- Apache Kafka `KafkaConsumer` Javadoc: https://kafka.apache.org/25/javadoc/org/apache/kafka/clients/consumer/KafkaConsumer.html
- Confluent Kafka Producer documentation: https://docs.confluent.io/platform/current/clients/producer.html
- Confluent Kafka Consumer Design documentation: https://docs.confluent.io/kafka/design/consumer-design.html
- Confluent Kafka partition count guidance: https://docs.confluent.io/kafka/operations-tools/partition-determination.html
- Confluent Kafka Message Delivery Guarantees: https://docs.confluent.io/kafka/design/delivery-semantics.html

## Issues Found
- The custom partitioner used `Math.abs(customerId.hashCode()) % numPartitions`, which can still produce a negative value for `Integer.MIN_VALUE`. Changed it to `Math.floorMod(customerId.hashCode(), numPartitions)` so the returned partition is always in range.
- The custom partitioner comment said null keys used round-robin assignment, but the sample code used random partition selection. Updated the comment to match the code and avoid claiming round-robin behavior.
- The idempotent producer comment said idempotence provides exactly-once semantics. Idempotence prevents duplicate producer writes during retries, but full exactly-once processing semantics require broader transactional handling. Updated the wording to avoid overstating the guarantee.
- The concurrent consumer committed offsets with `consumer.commitAsync()` while records could still be waiting in worker queues. This could mark unprocessed records as consumed. Added processed-offset tracking in the partition worker and changed commits to include only offsets that have completed processing.

## Review Notes
The post is technically relevant and the main Kafka ordering guidance is correct: Kafka preserves order within a partition, keyed records are routed consistently by the producer partitioner while partition counts remain stable, idempotent producers preserve ordering with up to five in-flight requests, and consumers should commit the next offset after successful processing. Future improvements could mention more explicitly that adding partitions to a keyed topic can change key-to-partition mapping.
