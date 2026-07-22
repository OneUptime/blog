# Validation Summary: How to Design an Idempotent Consumer for At-Least-Once Messaging

## Status
validated

## Post Type
Technical guide

## Technologies Covered

- At-least-once messaging and idempotent consumers
- Apache Kafka 4.3 consumer offsets and transactions
- RabbitMQ manual consumer acknowledgements, delivery tags, and redelivery
- Amazon SQS standard queues, receipt handles, and visibility timeouts
- PostgreSQL transactions, composite primary keys, and `INSERT ... ON CONFLICT`
- Transactional outbox pattern

## Sources Consulted

- [Apache Kafka 4.3: Message Delivery Semantics and Using Transactions](https://kafka.apache.org/43/design/design/#messagesemantics)
- [RabbitMQ: Consumer Acknowledgements and Publisher Confirms](https://www.rabbitmq.com/docs/confirms)
- [RabbitMQ: Reliability Guide](https://www.rabbitmq.com/docs/reliability)
- [Amazon SQS: At-least-once delivery](https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/standard-queues-at-least-once-delivery.html)
- [Amazon SQS: Visibility timeout](https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/sqs-visibility-timeout.html)
- [Amazon SQS: Queue and message identifiers](https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/sqs-queue-message-identifiers.html)
- [PostgreSQL 18: Transactions](https://www.postgresql.org/docs/current/tutorial-transactions.html)
- [PostgreSQL 18: Constraints](https://www.postgresql.org/docs/current/ddl-constraints.html#DDL-CONSTRAINTS-UNIQUE-CONSTRAINTS)
- [PostgreSQL 18: INSERT](https://www.postgresql.org/docs/current/sql-insert.html)
- [PostgreSQL 18: Transaction Isolation](https://www.postgresql.org/docs/current/transaction-iso.html)
- [AWS Prescriptive Guidance: Transactional outbox pattern](https://docs.aws.amazon.com/prescriptive-guidance/latest/cloud-design-patterns/transactional-outbox.html)

## Issues Found
No technical issues found.

## Review Notes

- The PostgreSQL DDL and `INSERT ... ON CONFLICT DO NOTHING ... RETURNING` example are valid for PostgreSQL 18. Under concurrent claims, the primary key arbitrates the conflict, and `RETURNING` reports only a row that was actually inserted.
- The RabbitMQ acknowledgment guidance correctly assumes manual acknowledgements; unacknowledged deliveries are automatically requeued when their channel or connection closes, and acknowledgements must use the receiving channel.
- The SQS guidance correctly requires the most recently received receipt handle for deletion and recommends extending visibility when processing may outlast the current timeout.
- The Kafka 4.3 documentation confirms that ordinary process-then-save-position consumption is at least once and that Kafka transactions atomically cover Kafka output records and consumed offsets, not arbitrary SQL or HTTP side effects.
- All documentation links in the post resolved to the intended official resources during review.
