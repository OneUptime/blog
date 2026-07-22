# Validation Summary: Kafka Producer Retries vs. Consumer Reprocessing: Finding Duplicate Sources

## Status
validated

## Post Type
Technical guide

## Technologies Covered

- Apache Kafka 4.3
- Kafka producer retries and delivery timeouts
- Kafka idempotent and transactional producers
- Kafka consumer groups, offsets, commits, and reprocessing
- Transactional outbox and idempotent consumer patterns

## Sources Consulted

- [Apache Kafka 4.3 `KafkaProducer` API](https://kafka.apache.org/43/javadoc/org/apache/kafka/clients/producer/KafkaProducer.html)
- [Apache Kafka 4.3 producer configuration](https://kafka.apache.org/43/configuration/producer-configs/)
- [Apache Kafka 4.3 `KafkaConsumer` API](https://kafka.apache.org/43/javadoc/org/apache/kafka/clients/consumer/KafkaConsumer.html)
- [Apache Kafka 4.3 consumer configuration](https://kafka.apache.org/43/configuration/consumer-configs/)
- [Apache Kafka 4.3 delivery semantics](https://kafka.apache.org/43/design/design/#message-delivery-semantics)
- [Apache Kafka 4.3 transaction protocol](https://kafka.apache.org/43/operations/transaction-protocol/)
- [Apache Kafka 4.3.1 release announcement](https://kafka.apache.org/blog/2026/06/25/apache-kafka-4.3.1-release-announcement/)
- [AWS Prescriptive Guidance: Transactional outbox pattern](https://docs.aws.amazon.com/prescriptive-guidance/latest/cloud-design-patterns/transactional-outbox.html)

## Issues Found

- The observability guidance implied that every successful send returns an assigned offset. With `acks=0`, Kafka returns `RecordMetadata` with offset `-1` because it does not wait for a broker acknowledgement. The text now limits the advice to acknowledged successes and documents the `acks=0` exception.
- The transaction section used the ambiguous term “transactional producer ID” for the configured recovery and fencing identity. Kafka distinguishes the configured `transactional.id` from its internal producer ID, so the text now names `transactional.id` explicitly.

## Review Notes

- The post's producer configuration is valid for Kafka 4.3: idempotence requires `acks=all`, `retries` greater than zero, and at most five in-flight requests per connection. Leaving `retries` unset correctly uses its idempotent default, while `delivery.timeout.ms` bounds delivery time.
- The consumer-offset and transaction explanations agree with Kafka's documented semantics: committed offsets identify the next record to process, asynchronous commit errors require callback handling, and Kafka transactions do not atomically include arbitrary external database or REST side effects.
- The `/43/` documentation currently serves the Kafka 4.3.1 maintenance release. The reviewed behavior is unchanged from the 4.3.0 claims made in the post.
