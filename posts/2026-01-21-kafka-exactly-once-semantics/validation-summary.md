# Validation Summary: How to Implement Exactly-Once Semantics in Kafka Producers

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Apache Kafka producer API
- Kafka idempotent producers
- Kafka transactions and transactional IDs
- Kafka consumer isolation levels and transactional offset commits
- Java Kafka client
- confluent-kafka Python client
- KafkaJS
- Kafka broker transaction configuration

## Sources Consulted
- Apache Kafka `KafkaProducer` Java API documentation: https://kafka.apache.org/30/javadoc/org/apache/kafka/clients/producer/KafkaProducer.html
- Apache Kafka producer configuration reference: https://kafka.apache.org/41/configuration/producer-configs/
- Apache Kafka broker configuration reference: https://kafka.apache.org/41/configuration/broker-configs/
- Confluent Python client API documentation: https://docs.confluent.io/platform/current/clients/confluent-kafka-python/html/index.html
- KafkaJS transactions documentation: https://kafka.js.org/docs/transactions
- Apache Kafka `Consumer` Java API documentation: https://kafka.apache.org/39/javadoc/org/apache/kafka/clients/consumer/Consumer.html

## Issues Found
- The post described EOS as "exactly-once delivery" and "messages are delivered exactly once," which overstates Kafka's guarantee. Updated the wording to describe exactly-once writes and stream processing within Kafka's idempotent and transactional guarantees.
- The metadata description claimed the producer assigns its own Producer ID. Updated it to state that Kafka assigns the Producer ID during initialization.
- The Java read-process-write example used the deprecated `sendOffsetsToTransaction(offsets, consumerGroup)` overload. Updated it to use `sendOffsetsToTransaction(offsets, consumer.groupMetadata())`, matching the current Kafka client API.
- The Python read-process-write example closed the consumer but not the producer. Added `self.producer.close()` in the `finally` block.
- The broker configuration comment said `transactional.id.expiration.ms` enables EOS. Updated the comment to describe it as transactional ID expiration.

## Review Notes
The code examples are intentionally simplified and omit production concerns such as detailed retry classification for Python transaction errors, topic-level durability settings for transactional output topics, and shutdown coordination for long-running processors. The remaining examples match current documented APIs and configuration names.
