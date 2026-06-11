# Validation Summary: How to Create Kafka Idempotent Producers

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Apache Kafka
- Kafka Java producer client
- Idempotent producers
- Producer configuration
- Kafka producer metrics
- Kafka transactions

## Sources Consulted
- Apache Kafka Producer Configs: https://kafka.apache.org/43/configuration/producer-configs/
- Apache Kafka KafkaProducer Javadocs: https://kafka.apache.org/43/javadoc/org/apache/kafka/clients/producer/KafkaProducer.html
- Apache Kafka KIP-98, Exactly Once Delivery and Transactional Messaging: https://cwiki.apache.org/confluence/display/KAFKA/KIP-98+-+Exactly+Once+Delivery+and+Transactional+Messaging
- Apache Kafka Message Format: https://kafka.apache.org/43/implementation/message-format/
- Apache Kafka UnknownProducerIdException Javadocs: https://kafka.apache.org/43/javadoc/org/apache/kafka/common/errors/UnknownProducerIdException.html
- Apache Kafka Producer Metrics: https://kafka.apache.org/32/generated/producer_metrics.html

## Issues Found
- The description and conclusion overstated idempotent producers as general exactly-once semantics. Updated the wording to clarify that idempotence provides producer-side exactly-once delivery for retries within a producer session, while broader exactly-once workflows require transactions.
- The enablement section implied `enable.idempotence=true` is always required. Updated it to note that Kafka 3.0 and later enable idempotence by default when there are no conflicting producer configurations.
- The configuration table said `retries` must be `Integer.MAX_VALUE`. Updated it to the actual requirement, `retries > 0`, while noting Kafka's default is `Integer.MAX_VALUE`.
- The batching section incorrectly said the sequence number corresponds to the last message in the batch, and the example created batching properties without applying them to the producer. Updated the explanation to use base sequence numbers with consecutive record sequences, and moved batching settings into a producer factory method.
- The fatal error guidance treated all `OutOfOrderSequenceException` cases as strictly fatal. Updated the text to clarify the idempotent-only caveat and the practical recommendation to recreate the producer when continuing could risk reordering.
- The multi-threaded example allocated an executor but did not actually use it to send from multiple threads. Updated the example so sends are scheduled on the executor.
- The producer lifecycle section implied every restart uses producer epochs the same way. Updated the wording to distinguish non-transactional idempotent producer PIDs from transactional producer epoch fencing.

## Review Notes
The Java examples are blog snippets rather than complete compilation units, so imports for common Java and Kafka classes are assumed. The post now aligns with current Kafka producer configuration behavior and the documented idempotent producer limitations.
