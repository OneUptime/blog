# Validation Summary: Why At-Least-Once Delivery Creates Duplicates (and Why That Is Expected)

## Status
validated

## Post Type
Technical guide / Distributed systems reference

## Technologies Covered
- At-least-once and at-most-once message delivery
- Idempotent message consumers and stable event IDs
- Transactional inbox and outbox patterns
- RabbitMQ consumer acknowledgements, publisher confirms, redelivery, and prefetch
- Amazon SQS standard queues, visibility timeouts, and dead-letter queues
- Apache Kafka consumer offset commits, idempotent producers, and transactions
- Relational database transactions and unique constraints

## Sources Consulted
- [RabbitMQ Reliability Guide](https://www.rabbitmq.com/docs/reliability) - verified publisher-confirm ambiguity, retransmission duplicates, consumer redelivery, idempotency guidance, and the meaning of the `redelivered` flag.
- [RabbitMQ Consumer Acknowledgements and Publisher Confirms](https://www.rabbitmq.com/docs/confirms) - verified automatic requeueing of unacknowledged deliveries, acknowledgement/confirm independence, and bounded prefetch behavior.
- [RabbitMQ Consumers Guide](https://www.rabbitmq.com/docs/consumers) - verified delivery metadata and prefetch as the bound on in-flight, unacknowledged deliveries.
- [Amazon SQS at-least-once delivery](https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/standard-queues-at-least-once-delivery.html) - verified redundant message copies and the documented duplicate-delivery scenario during deletion.
- [Amazon SQS visibility timeout](https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/sqs-visibility-timeout.html) - verified visibility expiration, programmatic extension, heartbeat guidance, and the lack of an absolute no-duplicates guarantee during the visibility timeout.
- [Amazon SQS dead-letter queues](https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/sqs-dead-letter-queues.html) - verified bounded receives through `maxReceiveCount`, retention considerations, and redrive behavior.
- [Apache Kafka 4.3 design: message delivery semantics](https://kafka.apache.org/43/design/design/#message-delivery-semantics) - verified at-least-once versus at-most-once offset ordering, transactional offset/output handling, `read_committed` consumption, and the external-system boundary.
- [Apache Kafka 4.3 consumer configuration](https://kafka.apache.org/43/generated/consumer_config.html) - verified `isolation.level=read_committed`, `enable.auto.commit`, and `max.poll.interval.ms` rebalance behavior.
- [Apache Kafka 4.3.1 `KafkaProducer` API](https://kafka.apache.org/43/javadoc/org/apache/kafka/clients/producer/KafkaProducer.html) - verified idempotent-producer scope, transactional producers, and atomic `sendOffsetsToTransaction` behavior.
- [PostgreSQL `INSERT` documentation](https://www.postgresql.org/docs/current/sql-insert.html) - verified atomic conflict handling under concurrency and `ON CONFLICT DO NOTHING` as an example of a conflict-safe insert.
- [PostgreSQL transaction documentation](https://www.postgresql.org/docs/current/tutorial-transactions.html) - verified atomic commit of the deduplication record and business update.

## Issues Found
1. **Inbox pseudocode did not specify conflict-safe insertion.** A plain insert that raises a unique-constraint violation can abort the current transaction in databases such as PostgreSQL, so the subsequent commit shown in the original pseudocode would not work as written. Changed the pseudocode to require a conflict-safe insert and to branch on whether a row was inserted. Implementations can use their database's atomic insert-if-absent mechanism, such as PostgreSQL `INSERT ... ON CONFLICT DO NOTHING`, and inspect the affected-row result.
2. **The Kafka message-semantics link used an invalid fragment.** The Kafka 4.3 page's heading ID is `message-delivery-semantics`, not `messagesemantics`. Updated the link so it opens the intended section.

## Review Notes
- All six documentation destinations return the intended official resources. RabbitMQ blocks a generic command-line HTTP client with HTTP 403, but the pages are live and accessible through the documentation site/browser.
- The Kafka links intentionally target the 4.3 documentation set; the producer API currently identifies itself as Kafka 4.3.1. The claims in the post match that version.
- Kafka's transactional guarantee described here is correctly limited to consume-process-produce workflows whose offsets and output records are committed to Kafka in one transaction. The post correctly avoids extending that guarantee to arbitrary external systems.
- The pseudocode remains database-neutral. Concrete implementations must use the target database's supported conflict-handling syntax or equivalent savepoint/error-handling mechanism.
