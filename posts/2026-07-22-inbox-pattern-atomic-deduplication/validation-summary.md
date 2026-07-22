# Validation Summary: The Inbox Pattern: Atomically Deduplicating Messages with Business Updates

## Status

validated

## Post Type

Technical guide

## Technologies Covered

- PostgreSQL transactions, primary keys, unique indexes, data-modifying CTEs, and `INSERT ... ON CONFLICT`
- Transactional inbox and outbox patterns
- At-least-once message consumption and idempotency
- RabbitMQ consumer acknowledgements
- Amazon SQS message identifiers, deletion, redelivery, and dead-letter redrive
- Apache Kafka record offsets and consumer offset commits
- Amazon DynamoDB condition expressions and `TransactWriteItems`
- Remote API idempotency and reconciliation

## Sources Consulted

- [PostgreSQL `INSERT` and `ON CONFLICT`](https://www.postgresql.org/docs/current/sql-insert.html)
- [PostgreSQL data-modifying statements in `WITH`](https://www.postgresql.org/docs/current/queries-with.html#QUERIES-WITH-MODIFYING)
- [PostgreSQL constraints and primary keys](https://www.postgresql.org/docs/current/ddl-constraints.html)
- [PostgreSQL index uniqueness checks](https://www.postgresql.org/docs/current/index-unique-checks.html)
- [PostgreSQL transaction isolation](https://www.postgresql.org/docs/current/transaction-iso.html)
- [PostgreSQL serialization failure handling](https://www.postgresql.org/docs/current/mvcc-serialization-failure-handling.html)
- [PostgreSQL table-partitioning limitations](https://www.postgresql.org/docs/current/ddl-partitioning.html#DDL-PARTITIONING-DECLARATIVE-LIMITATIONS)
- [AWS transactional outbox pattern](https://docs.aws.amazon.com/prescriptive-guidance/latest/cloud-design-patterns/transactional-outbox.html)
- [Amazon DynamoDB condition expressions](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/Expressions.ConditionExpressions.html)
- [Amazon DynamoDB `TransactWriteItems`](https://docs.aws.amazon.com/amazondynamodb/latest/APIReference/API_TransactWriteItems.html)
- [Amazon SQS message identifiers](https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/sqs-queue-message-identifiers.html)
- [Amazon SQS at-least-once delivery](https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/standard-queues-at-least-once-delivery.html)
- [RabbitMQ consumer acknowledgements and automatic requeueing](https://www.rabbitmq.com/docs/confirms)
- [Apache Kafka message-delivery semantics](https://kafka.apache.org/40/design/design/#message-delivery-semantics)
- [AWS Lambda Powertools idempotency utility](https://docs.aws.amazon.com/powertools/python/latest/utilities/idempotency/)

## Issues Found

- The retention section recommended partitioning the inbox by processing date without noting PostgreSQL's cross-partition uniqueness limitation. PostgreSQL requires a unique or primary-key constraint on a partitioned table to include every partition-key column. Including `processed_at` would therefore make uniqueness date-scoped and could allow the same `(consumer_name, message_id)` in multiple partitions. The post now requires a non-expiring authoritative key registry or another mechanism that preserves identity uniqueness across the required retention window.

## Review Notes

- The SQL uses application-style named placeholders such as `:message_id`; these must be bound by the application's database library before PostgreSQL receives the statement.
- The `ON CONFLICT ... RETURNING` claim logic, transaction rollback requirements, serialization retry guidance, inbox/outbox composition, DynamoDB ten-minute client-token window, and broker settlement ordering are consistent with the official documentation.
- No product versions are pinned. The reviewed PostgreSQL syntax is supported by the current documentation (PostgreSQL 18 on the validation date), and the cited AWS, RabbitMQ, and Kafka concepts are current.
