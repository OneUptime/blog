# Validation Summary: How to Create Exactly-Once Delivery

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Distributed messaging delivery guarantees
- TypeScript
- Node.js
- PostgreSQL
- node-postgres
- Apache Kafka
- KafkaJS
- Redis
- ioredis
- Transactional outbox pattern

## Sources Consulted
- KafkaJS transactions documentation: https://kafka.js.org/docs/transactions
- KafkaJS consuming documentation: https://kafka.js.org/docs/consuming
- node-postgres transactions documentation: https://node-postgres.com/features/transactions
- PostgreSQL SELECT locking clause documentation: https://www.postgresql.org/docs/current/sql-select.html
- Redis SET command documentation: https://redis.io/docs/latest/commands/set/
- ioredis README and API documentation: https://github.com/redis/ioredis
- Microservices.io Transactional Outbox pattern: https://microservices.io/patterns/data/transactional-outbox.html
- Confluent Kafka delivery semantics documentation: https://docs.confluent.io/kafka/design/delivery-semantics.html

## Issues Found
- The idempotency example checked for an existing key only before running the operation, then stored the result afterward. Concurrent requests with the same key could both execute the operation. I changed the example to reserve the key first with `INSERT ... ON CONFLICT DO NOTHING`, mark it `processing`, store the completed result later, and reject concurrent in-progress duplicates.
- The idempotency example used `JSON.parse(existing.response)`, but node-postgres parses `json/jsonb` values into JavaScript values by default. I changed the code to return the stored response value directly.
- The idempotency schema required `response JSONB NOT NULL`, which did not support reserving an in-progress key before a response exists. I changed the schema to allow a nullable response and added a `status` column plus `completed_at`.
- The outbox section implied the database update and broker publish were atomic and that the outbox pattern prevents duplicate publishes. I corrected the wording to say the business change and outbox record are atomic, while the relay remains at-least-once and consumers must be idempotent.
- The outbox TypeScript snippet used `crypto.randomUUID()` without importing `crypto`. I changed it to import `randomUUID` from `node:crypto`.
- The outbox publisher used a KafkaJS producer without showing that it must be connected before `send`. I added an `initialize()` method that calls `producer.connect()`.
- The KafkaJS transaction example sent offsets transactionally but left consumer auto-commit enabled by default. I added `autoCommit: false` to `consumer.run()` so offsets are committed only through the transaction.
- The KafkaJS transaction example used a generic static `transactionalId` without caveat. I updated the comment and example ID to clarify that production processors need a stable ID per processor instance or input partition.

## Review Notes
- KafkaJS transaction APIs, `transaction.sendOffsets()`, `readUncommitted: false`, and `maxInFlightRequests: 1` match the current KafkaJS documentation.
- PostgreSQL `FOR UPDATE SKIP LOCKED` is appropriate for queue-like outbox polling with multiple workers, per PostgreSQL documentation.
- Redis `SET key value EX seconds NX` is valid for atomic deduplication reservation. The Redis documentation notes stronger lock-release patterns for distributed locks; this post uses the command for short-lived deduplication, not a full distributed lock.
- Kafka transactions provide exactly-once semantics for consume-transform-produce flows within Kafka. External side effects still require idempotency or an atomic offset/result store.
