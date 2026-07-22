# Validation Summary: Where Should Deduplication State Live: SQL, Redis, or the Message Broker?

## Status
validated

## Post Type
Technical guide and comparative reference

## Technologies Covered
- PostgreSQL transactions, primary keys, unique constraints, and `INSERT ... ON CONFLICT ... RETURNING`
- Redis conditional `SET`, expiration, eviction, persistence, replication, `WAIT`, and Lua scripting
- Apache Kafka consumer offsets, transactions, and read-committed consumption
- Amazon SQS FIFO deduplication, Standard queue delivery semantics, and visibility timeouts
- RabbitMQ consumer acknowledgements, redelivery, and delivery tags
- Transactional outbox and idempotent external API integration patterns

## Sources Consulted
- [PostgreSQL transactions](https://www.postgresql.org/docs/current/tutorial-transactions.html)
- [PostgreSQL unique constraints and primary keys](https://www.postgresql.org/docs/current/ddl-constraints.html#DDL-CONSTRAINTS-UNIQUE-CONSTRAINTS)
- [PostgreSQL `INSERT`, `ON CONFLICT`, and `RETURNING`](https://www.postgresql.org/docs/current/sql-insert.html)
- [Redis `SET`](https://redis.io/docs/latest/commands/set/)
- [Redis persistence](https://redis.io/docs/latest/operate/oss_and_stack/management/persistence/)
- [Redis replication and `WAIT` limitations](https://redis.io/docs/latest/operate/oss_and_stack/management/replication/)
- [Redis key eviction](https://redis.io/docs/latest/develop/reference/eviction/)
- [Redis Lua scripting](https://redis.io/docs/latest/develop/programmability/eval-intro/)
- [Apache Kafka message delivery semantics and transactions](https://kafka.apache.org/43/design/design/#messagesemantics)
- [Apache Kafka consumer configuration](https://kafka.apache.org/43/generated/consumer_config.html)
- [Amazon SQS FIFO message deduplication IDs](https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/using-messagededuplicationid-property.html)
- [Amazon SQS at-least-once delivery](https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/standard-queues-at-least-once-delivery.html)
- [Amazon SQS visibility timeout](https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/sqs-visibility-timeout.html)
- [RabbitMQ consumer acknowledgements and redelivery](https://www.rabbitmq.com/docs/confirms)
- [RabbitMQ reliability guide](https://www.rabbitmq.com/docs/reliability)
- [AWS transactional outbox pattern](https://docs.aws.amazon.com/prescriptive-guidance/latest/cloud-design-patterns/transactional-outbox.html)

## Issues Found
- The Redis conclusion said Redis could be authoritative when its durability semantics met the business requirement **or** when all state was changed atomically within Redis. Those conditions are not alternatives: atomic Redis-only mutation does not compensate for insufficient durability or retention, and durable Redis configuration does not extend atomicity to an external effect. Changed the sentence to require both Redis-local atomicity and suitable durability, retention, and failure semantics.

## Review Notes
- The PostgreSQL DDL and `INSERT ... ON CONFLICT DO NOTHING ... RETURNING` claim pattern are syntactically valid and correctly rely on a composite primary key and one database transaction.
- `SET key value NX EX seconds`, Redis persistence and eviction caveats, asynchronous replication, and the limitations of `WAIT` agree with the current Redis documentation.
- The Kafka guarantee is correctly limited to transactional Kafka-to-Kafka processing with committed offsets and read-committed consumers; external destination systems require their own cooperation.
- The SQS five-minute FIFO deduplication window and consumer redelivery caveats are accurate. The RabbitMQ redelivery flag is correctly described as a hint rather than an application idempotency ledger.
