# Validation Summary: Consumer Crashes After the Side Effect but Before Acknowledgement

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Distributed systems
- Message queues and at-least-once delivery
- RabbitMQ 4.3 consumer acknowledgements and prefetch
- Amazon SQS visibility timeouts, receipt handles, and standard-queue delivery semantics
- Apache Kafka 4.3 consumer offsets, rebalances, and transactions
- PostgreSQL transactions, primary keys, and `INSERT ... ON CONFLICT`
- Idempotency keys
- Transactional inbox and outbox patterns

## Sources Consulted
- [RabbitMQ consumer acknowledgements and publisher confirms](https://www.rabbitmq.com/docs/confirms)
- [RabbitMQ reliability guide](https://www.rabbitmq.com/docs/reliability)
- [Amazon SQS visibility timeout](https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/sqs-visibility-timeout.html)
- [Amazon SQS at-least-once delivery](https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/standard-queues-at-least-once-delivery.html)
- [Amazon SQS queue and message identifiers](https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/sqs-queue-message-identifiers.html)
- [Apache Kafka 4.3 `KafkaConsumer` API](https://kafka.apache.org/43/javadoc/org/apache/kafka/clients/consumer/KafkaConsumer.html)
- [Apache Kafka 4.3 design and delivery semantics](https://kafka.apache.org/43/design/design/#message-delivery-semantics)
- [Apache Kafka 4.3 consumer configuration](https://kafka.apache.org/43/generated/consumer_config.html)
- [AWS transactional outbox pattern](https://docs.aws.amazon.com/prescriptive-guidance/latest/cloud-design-patterns/transactional-outbox.html)
- [PostgreSQL constraints](https://www.postgresql.org/docs/current/ddl-constraints.html)
- [PostgreSQL `INSERT`](https://www.postgresql.org/docs/current/sql-insert.html)
- [Stripe idempotent requests](https://docs.stripe.com/api/idempotent_requests)

## Issues Found
- The inbox pseudocode did not specify how a duplicate primary-key conflict was handled. A plain PostgreSQL `INSERT` raises a unique-constraint error and leaves the transaction unable to proceed normally. Changed the claim step to use `ON CONFLICT (consumer_name, event_id) DO NOTHING` and branch on whether a row was inserted, which safely arbitrates concurrent attempts.
- The Kafka concurrency guidance said to commit the highest contiguous completed offset. Kafka commits the offset of the next record to consume, so that wording was off by one. Changed it to commit the next offset after the highest contiguous completed record.
- The Kafka pause guidance did not state that the consumer must keep polling while work runs on other threads. Clarified that the consumer thread continues polling while affected partitions are paused, preserving group membership while preventing additional records from those partitions from being returned.

## Review Notes
- The Kafka 4.3 API URL resolves to the Kafka 4.3.1 Javadoc and was current at validation time.
- PostgreSQL's `current` documentation resolved to PostgreSQL 18 at validation time.
- Deduplication records and downstream idempotency keys require retention windows that cover the application's possible retry and replay period; provider-specific idempotency-key expiration policies still apply.
