# Validation Summary: How to Achieve Exactly-Once Processing in Kafka

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Apache Kafka
- Kafka Java producer API
- Kafka Java consumer API
- Kafka idempotent producers
- Kafka transactions
- Kafka broker configuration
- Java

## Sources Consulted
- Apache Kafka Producer Configuration Reference: https://kafka.apache.org/41/configuration/producer-configs/
- Apache Kafka Consumer Configuration Reference: https://kafka.apache.org/41/configuration/consumer-configs/
- Apache Kafka Broker Configuration Reference: https://kafka.apache.org/41/configuration/broker-configs/
- Apache Kafka KafkaProducer Java API: https://kafka.apache.org/41/javadoc/org/apache/kafka/clients/producer/KafkaProducer.html

## Issues Found
- The post described exactly-once as each message being "delivered and processed exactly one time." This overstated Kafka's guarantee, which applies to Kafka read-process-write output effects when producers, transactions, offsets, and consumers are configured correctly. I changed the wording to scope the guarantee to Kafka output in a properly configured pipeline.
- The transactional producer section said transactions extend idempotence across restarts. Kafka's `transactional.id` supports transaction recovery and fencing across producer sessions, but it does not deduplicate arbitrary application-level resends after restart. I changed the wording to describe atomic writes across producer sessions and partitions.
- The transactional producer Java example caught `KafkaException` without importing `org.apache.kafka.common.KafkaException`. I added the missing import.
- The consumer section implied that a read-committed consumer alone participates in exactly-once processing and that offsets were committed as part of transactions in the standalone consumer example. I renamed the section to read-committed consumers, clarified that `read_committed` controls visibility of transactional messages, and corrected the offset commit comment.
- The description of `isolation.level=read_committed` omitted the behavior for open transactions and non-transactional messages. I updated it to state that aborted transactional messages are filtered, open transactions are withheld, and non-transactional messages are returned normally.
- The broker section said to enable transaction support on brokers. Kafka transactions are a built-in broker feature; the listed settings are production durability and timeout settings for transaction state. I changed the wording accordingly.
- The "perfect ordering" event-sourcing bullet was too broad because Kafka ordering is per partition. I changed it to partition-level ordering and duplicate-free Kafka outputs.
- The conclusion claimed Kafka EOS eliminates duplicates and data loss broadly. I narrowed it to preventing duplicate Kafka outputs in read-process-write pipelines.

## Review Notes
The Java API usage is current: the consume-transform-produce example uses `sendOffsetsToTransaction(Map<TopicPartition, OffsetAndMetadata>, ConsumerGroupMetadata)`, which is the non-deprecated form documented by Kafka. The examples are illustrative and omit production concerns such as retry loops around abortable transaction failures, static membership, leader epoch metadata in committed offsets, and unique transactional IDs per task or partition assignment.
