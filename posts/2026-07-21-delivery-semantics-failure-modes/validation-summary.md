# Validation Summary: At-Least-Once vs. At-Most-Once vs. Exactly-Once: Choosing by Failure Mode

## Status
validated

## Post Type
Technical guide

## Technologies Covered

- Distributed message delivery semantics
- RabbitMQ consumer acknowledgements, publisher confirms, prefetch, and dead lettering
- Amazon SQS standard queues, FIFO queues, visibility timeouts, and deduplication
- Apache Kafka consumer offsets, idempotent producers, transactions, and Kafka Streams
- Database-backed idempotency, transactional outbox patterns, locking, and transaction isolation

## Sources Consulted

- [RabbitMQ Reliability Guide](https://www.rabbitmq.com/docs/reliability)
- [RabbitMQ Consumer Acknowledgements and Publisher Confirms](https://www.rabbitmq.com/docs/confirms)
- [Amazon SQS at-least-once delivery](https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/standard-queues-at-least-once-delivery.html)
- [Amazon SQS visibility timeout](https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/sqs-visibility-timeout.html)
- [Exactly-once processing in Amazon SQS](https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/FIFO-queues-exactly-once-processing.html)
- [Amazon SQS standard queues](https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/standard-queues.html)
- [Apache Kafka 4.3 Design: Message Delivery Semantics](https://kafka.apache.org/43/design/design/#messagesemantics)
- [Apache Kafka 4.3.1 KafkaProducer API](https://kafka.apache.org/43/javadoc/org/apache/kafka/clients/producer/KafkaProducer.html)
- [Apache Kafka 4.3 Kafka Streams configuration](https://kafka.apache.org/43/streams/developer-guide/config-streams/)
- [PostgreSQL 18 Transaction Isolation](https://www.postgresql.org/docs/current/transaction-iso.html)

## Issues Found

- The Kafka section said that the idempotent producer prevents duplicates caused by producer retries without stating its session boundary. Kafka's producer documentation says application-level re-sends cannot be deduplicated and idempotence is guaranteed only within a single producer session. The text now limits the claim to client retries within one producer session.
- The idempotency section implied that only a uniqueness constraint could make a concurrent "check then act" sequence safe. Serializable isolation and suitable database locking can also serialize the decision. The sentence now names those concurrency-control alternatives.

## Review Notes

- The post correctly scopes Kafka exactly-once processing to Kafka transactions, consumed offsets, Kafka topic output, and consumers using `read_committed`; it correctly excludes arbitrary external side effects unless the destination cooperates.
- The post correctly distinguishes SQS FIFO producer-side deduplication within the five-minute interval from consumer-side redelivery after visibility timeout expiry or failed deletion.
- The post correctly describes RabbitMQ manual acknowledgement redelivery, the independent publisher-confirm boundary, and the need for idempotent consumers after ambiguous confirms.
- The cited Kafka URLs target the current Kafka 4.3 documentation and the producer API page identifies version 4.3.1. No deprecated code examples, commands, or configuration snippets appear in the post.
