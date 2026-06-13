# Validation Summary: How to Guarantee Message Order in Kafka

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Apache Kafka
- Kafka topics and partitions
- Kafka producer configuration
- Kafka consumer groups
- Java Kafka client APIs
- Kafka command-line tools

## Sources Consulted
- Apache Kafka Introduction and Guarantees: https://kafka.apache.org/documentation/
- Apache Kafka 4.1 Producer Configs: https://kafka.apache.org/41/configuration/producer-configs/
- Apache Kafka 4.3 Basic Kafka Operations: https://kafka.apache.org/43/operations/basic-kafka-operations/
- Apache Kafka Partitioner Javadoc: https://javadoc.io/doc/org.apache.kafka/kafka-clients/latest/org/apache/kafka/clients/producer/Partitioner.html

## Issues Found
- The post stated that messages with the same key always go to the same partition. I changed this to clarify that the guarantee depends on keeping the partition count and partitioner unchanged, because Kafka's hash-based partition mapping can change when partitions are added.
- The consumer-group principle said consumers read from exclusive partitions. I changed it to state that each partition is read by only one consumer in a consumer group, which matches Kafka's assignment model and avoids implying that a consumer can read only one partition.
- The multi-threaded consumer example created one long-lived worker per key on a fixed thread pool. After the first ten keys, later key processors could be queued forever because the first workers never exit. I replaced it with fixed worker stripes so the same key maps to the same queue while the number of workers remains bounded.
- The multi-threaded consumer example committed offsets immediately after enqueueing work, before processing completed. I changed it to wait for the polled batch to finish before committing offsets.

## Review Notes
- The Kafka topic creation command uses current `kafka-topics.sh` flags.
- The producer configuration guidance matches current Kafka idempotence requirements: `acks=all`, retries greater than zero, and `max.in.flight.requests.per.connection` no greater than 5 preserve ordering when idempotence is enabled.
- The custom partitioner API remains valid for current Kafka clients.
