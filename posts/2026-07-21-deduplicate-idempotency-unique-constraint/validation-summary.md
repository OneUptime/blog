# Validation Summary: Deduplicating Messages with Idempotency Keys and Unique Database Constraints

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- PostgreSQL unique constraints, primary keys, transactions, and transaction isolation
- PostgreSQL `INSERT ... ON CONFLICT DO NOTHING ... RETURNING`
- Idempotency keys and payload digests
- Message-consumer deduplication and broker acknowledgements
- RabbitMQ delivery tags and redelivery behavior
- Apache Kafka offsets and transactions
- Amazon SQS FIFO deduplication and visibility timeouts
- Transactional outbox pattern

## Sources Consulted
- PostgreSQL unique constraints and primary keys: https://www.postgresql.org/docs/current/ddl-constraints.html#DDL-CONSTRAINTS-UNIQUE-CONSTRAINTS
- PostgreSQL `INSERT`, `ON CONFLICT`, and `RETURNING`: https://www.postgresql.org/docs/current/sql-insert.html
- PostgreSQL transactions: https://www.postgresql.org/docs/current/tutorial-transactions.html
- PostgreSQL transaction isolation: https://www.postgresql.org/docs/current/transaction-iso.html
- Apache Kafka message delivery semantics and transactions: https://kafka.apache.org/43/design/design/#messagesemantics
- RabbitMQ consumer acknowledgements and delivery tags: https://www.rabbitmq.com/docs/confirms
- Amazon SQS message deduplication IDs: https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/using-messagededuplicationid-property.html
- Amazon SQS FIFO exactly-once processing and content-based deduplication: https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/FIFO-queues-exactly-once-processing.html
- Amazon SQS visibility timeout: https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/sqs-visibility-timeout.html
- AWS transactional outbox pattern: https://docs.aws.amazon.com/prescriptive-guidance/latest/cloud-design-patterns/transactional-outbox.html

## Issues Found
No technical issues found.

## Review Notes
- The executable PostgreSQL DDL and `INSERT ... ON CONFLICT DO NOTHING ... RETURNING` examples are syntactically correct. PostgreSQL documents that `RETURNING` emits only rows actually inserted or updated, which makes the returned-row claim test valid.
- The Read Committed concurrency explanation is accurate: a conflicting insert can prevent insertion even when the other transaction's row was not visible to the statement snapshot, and a later command receives a new snapshot.
- The abbreviated `INSERT INTO message_receipts (...) VALUES (...);` example is clearly illustrative pseudocode showing the unsafe check-then-insert sequence, not a complete executable statement.
- The SQS description correctly limits content-based deduplication to a five-minute send-side window and notes that its SHA-256 input includes the message body but not message attributes.
- The Kafka 4.3 documentation URL is current for the version linked, and its explanation of Kafka transactions and external destination systems supports the post's claim.
- No deprecated APIs, version-specific inaccuracies, invalid commands, or broken documentation links were found.
