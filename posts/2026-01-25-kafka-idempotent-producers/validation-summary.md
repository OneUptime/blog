# Validation Summary: How to Prevent Duplicates with Idempotent Producers in Kafka

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Apache Kafka
- Kafka Java producer client
- Kafka transactions
- Kafka consumer isolation levels
- Java configuration snippets

## Sources Consulted
- Apache Kafka Producer Configs: https://kafka.apache.org/41/configuration/producer-configs/
- Apache Kafka Consumer Configs: https://kafka.apache.org/41/configuration/consumer-configs/
- Apache Kafka Broker Configs: https://kafka.apache.org/41/configuration/broker-configs/
- Apache Kafka KafkaProducer Javadoc: https://kafka.apache.org/41/javadoc/org/apache/kafka/clients/producer/KafkaProducer.html
- Apache Kafka OutOfOrderSequenceException Javadoc: https://kafka.apache.org/41/javadoc/org/apache/kafka/common/errors/OutOfOrderSequenceException.html

## Issues Found
- The description implied idempotent producers alone provide exactly-once delivery semantics. Changed it to distinguish retry deduplication from end-to-end exactly-once processing with transactions.
- The non-idempotent duplicate sequence diagram showed sequence numbers even though sequence-number deduplication is part of idempotent producer behavior. Removed sequence numbers from that diagram.
- The producer examples that construct `KafkaProducer` instances omitted `key.serializer` and `value.serializer` in several places. Added `StringSerializer` configuration so the snippets are runnable with string keys and values.
- The transaction processing example omitted consumer deserializers. Added `StringDeserializer` configuration for string records.
- The retry explanation said retries were safe indefinitely. Clarified that `retries` may default to `Integer.MAX_VALUE`, but delivery is still bounded by `delivery.timeout.ms`.
- The producer restart section described idempotence as protecting broker-side retries. Changed it to producer retries within a producer session, matching Kafka's documented scope.
- The verification example implied Kafka deduplicates repeated application sends with the same key and value. Clarified that those are distinct sends; idempotence deduplicates producer retries for the same sequenced record.
- The transaction error handler used `seekToBeginning()` while claiming to reset to the last committed offset. Changed the code to seek each partition back to the first offset in the failed polled batch.
- The performance note claimed broker memory usage is bounded by `max.in.flight.requests.per.connection`. Reworded to the documented requirement that idempotence requires no more than 5 in-flight requests because brokers retain recent producer batches.
- The `OutOfOrderSequenceException` section listed misleading causes and recovery guidance. Updated it to match Kafka Javadoc: fatal for transactional producers; idempotence-only producers may continue but risk reordering.
- The broker configuration snippet incorrectly included `enable.idempotence=true` in `server.properties` and used the non-current `producer.id.expiration.check.interval.ms` setting as if it controlled cached sequence numbers. Replaced these with valid broker retention settings: `transactional.id.expiration.ms` and `producer.id.expiration.ms`.

## Review Notes
The benchmark numbers are presented as illustrative and do not cite a specific environment. They are plausible as an example, but future revisions should either cite a benchmark setup or label the figures as example-only.
