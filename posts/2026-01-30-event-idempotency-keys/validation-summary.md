# Validation Summary: How to Create Event Idempotency Keys

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Event-driven architecture
- Idempotency keys
- TypeScript
- Node.js crypto
- Redis
- ioredis
- PostgreSQL
- node-postgres

## Sources Consulted
- Node.js crypto documentation: https://nodejs.org/api/crypto.html
- Redis SET command documentation: https://redis.io/docs/latest/commands/set/
- Redis distributed locks documentation: https://redis.io/docs/latest/develop/clients/patterns/distributed-locks/
- ioredis documentation: https://github.com/redis/ioredis
- PostgreSQL INSERT / ON CONFLICT documentation: https://www.postgresql.org/docs/current/sql-insert.html
- PostgreSQL JSON types documentation: https://www.postgresql.org/docs/current/datatype-json.html
- node-postgres parameterized query documentation: https://node-postgres.com/features/queries
- RabbitMQ consumer acknowledgements documentation: https://www.rabbitmq.com/docs/confirms
- Confluent Kafka delivery semantics documentation: https://docs.confluent.io/kafka/design/delivery-semantics.html

## Issues Found
- The description and summary overstated idempotency keys as providing exactly-once processing semantics. Updated the wording to describe duplicate-safe processing for protected side effects, which is more accurate for at-least-once distributed systems.
- The client-provided key example generated `crypto.randomUUID()` inside `createPaymentEvent`, so calling the helper again during a retry would create a different idempotency key. Moved the request ID to an input generated at the request boundary so retries can reuse it.
- The content-hash example used `JSON.stringify(relevantFields, Object.keys(relevantFields).sort())`, which would omit nested payload fields because an array replacer also filters nested object keys. Added a recursive stable stringifier that sorts object keys while preserving nested payload content.
- The entity-operation key example treated `version = 0` as absent. Changed the check to `version !== undefined`.
- The Redis lock implementation released locks with a plain `DEL`, which can delete another worker's lock after the original lock expires and is reacquired. Updated the lock value to a UUID token and release logic to delete only when the stored token matches.
- The PostgreSQL example interpolated `ttlHours` directly into an interval string. Changed it to a node-postgres parameterized query using `$2 * INTERVAL '1 hour'`.
- The PostgreSQL schema used `CREATE INDEX` without `IF NOT EXISTS` even though the table creation was repeatable. Added `IF NOT EXISTS` to the index creation statement.
- The PostgreSQL snippet referenced `Pool` without importing it. Added `import { Pool } from 'pg';`.
- The PostgreSQL JSONB update passed an untyped JSON string. Added an explicit `$2::jsonb` cast.

## Review Notes
The Redis example is now safer for lock release, but Redis TTL locks still depend on the handler finishing within the lock validity window. For side effects that require stronger correctness, use a transactional data store, fencing tokens, or service-specific idempotency support in addition to the idempotency key.
