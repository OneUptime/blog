# Validation Summary: How to Implement the Inbox Pattern in Microservices

## Status
validated

## Post Type
Technical tutorial / implementation guide

## Technologies Covered
- Microservices
- Event-driven architecture
- Message queues
- PostgreSQL
- Node.js
- TypeScript
- node-postgres
- KafkaJS
- RabbitMQ / amqplib
- Prometheus / prom-client

## Sources Consulted
- PostgreSQL INSERT / ON CONFLICT documentation: https://www.postgresql.org/docs/current/sql-insert.html
- PostgreSQL SELECT locking documentation: https://www.postgresql.org/docs/current/sql-select.html
- node-postgres data type parsing documentation: https://node-postgres.com/features/types
- KafkaJS consuming messages documentation: https://kafka.js.org/docs/consuming
- RabbitMQ consumer acknowledgements and delivery tags documentation: https://www.rabbitmq.com/docs/confirms
- RabbitMQ consumers documentation: https://www.rabbitmq.com/docs/consumers
- Amazon SQS at-least-once delivery documentation: https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/standard-queues-at-least-once-delivery.html
- Confluent Kafka delivery semantics documentation: https://docs.confluent.io/kafka/design/delivery-semantics.html
- amqplib channel API documentation: https://amqp-node.github.io/amqplib/channel_api.html

## Issues Found
- The original implementation used `SELECT ... FOR UPDATE` to prevent concurrent duplicate processing, but that only locks rows that already exist and does not protect the missing-row path. Changed the core processor and race-condition explanation to use `INSERT ... ON CONFLICT DO NOTHING RETURNING message_id` with the `message_id` primary key.
- The retry handler referenced `retry_count`, but the schema did not define that column. Added `retry_count INTEGER NOT NULL DEFAULT 0` to the inbox table.
- The archive job inserted into `inbox_archive`, but no archive table was defined. Added an optional `CREATE TABLE inbox_archive (LIKE inbox INCLUDING ALL);` statement.
- The examples passed JSON payloads as `JSON.stringify(...)` and parsed `row.payload` from a `JSONB` column. node-postgres automatically serializes outbound objects and parses `json/jsonb` values into JavaScript objects, so the examples now pass and reuse objects directly.
- The retry helper claimed to implement exponential backoff but did not include any time-based backoff logic. Reworded it as retrying up to a maximum retry count.
- The hash-based message ID helper only sorted top-level keys. Replaced it with a small stable JSON stringifier so nested objects produce deterministic hashes.
- The RabbitMQ example used `deliveryTag` as a fallback deduplication ID, but RabbitMQ delivery tags are scoped to a channel and identify deliveries for acknowledgements, not stable logical messages. Changed the example to require a producer-provided `messageId` or `message-id` header.
- The Kafka example implied that topic/partition/offset is a general logical message ID. Clarified that it only deduplicates redelivery of the same Kafka record and that producer-provided IDs are preferred.
- A monitoring query was labeled as a deduplication-rate query even though duplicate attempts are not stored as separate inbox rows. Renamed it to track processing outcomes over time.
- The final summary overstated transport-level impossibility and application-level exactly-once guarantees. Reworded it to "not generally guaranteed" at the transport layer and "effectively-once" for business changes committed in the same database transaction.

## Review Notes
The post is technically relevant and validated after corrections. The examples are still illustrative snippets rather than a complete runnable repository; a future improvement would be to include a small test harness or migration file that compiles and runs the complete example end to end.
