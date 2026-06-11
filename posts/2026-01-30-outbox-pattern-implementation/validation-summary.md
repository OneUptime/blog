# Validation Summary: How to Build Outbox Pattern Implementation

## Status
validated

## Post Type
Tutorial / Implementation guide

## Technologies Covered
- Transactional Outbox pattern (architectural pattern)
- PostgreSQL (SQL schema, JSONB, partial indexes, `FOR UPDATE SKIP LOCKED`, `gen_random_uuid()`)
- Node.js with `pg` (node-postgres)
- RabbitMQ with `amqplib`
- Debezium PostgreSQL connector + Outbox EventRouter SMT
- Change Data Capture (CDC)

## Sources Consulted
- node-postgres documentation on type parsing (json/jsonb columns are auto-parsed into JS objects): https://node-postgres.com/features/types
- amqplib API reference for `channel.publish(exchange, routingKey, content, options)` signature and option fields (`persistent`, `messageId`, `contentType`): https://amqp-node.github.io/amqplib/channel_api.html
- PostgreSQL documentation on `gen_random_uuid()` (built-in from PG 13, partial indexes, `FOR UPDATE SKIP LOCKED` since PG 9.5): https://www.postgresql.org/docs/current/
- Debezium Outbox Event Router SMT documentation, including default field names (`route.by.field` defaults to `aggregatetype`, `table.field.event.key` defaults to `aggregateid`, etc.): https://debezium.io/documentation/reference/stable/transformations/outbox-event-router.html
- Debezium PostgreSQL connector configuration reference: https://debezium.io/documentation/reference/stable/connectors/postgresql.html
- Chris Richardson's reference description of the Transactional Outbox pattern: https://microservices.io/patterns/data/transactional-outbox.html

## Issues Found
1. **`Buffer.from(event.payload)` in the outbox publisher** — node-postgres automatically parses `JSONB` columns into JavaScript objects when selected. Passing the resulting object to `Buffer.from()` throws `TypeError: The first argument must be of type string or an instance of Buffer, ArrayBuffer, or Array...`. Changed to `Buffer.from(JSON.stringify(event.payload))` so the payload is serialized back to a JSON string before being wrapped in a Buffer.

2. **Missing `route.by.field` in the Debezium config** — The Debezium Outbox EventRouter SMT defaults `route.by.field` to `aggregatetype` (no underscore), but the schema in this post uses `aggregate_type` (snake_case). Without overriding the default, the SMT would not find the routing column and would either fail or drop events. Added `"transforms.outbox.route.by.field": "aggregate_type"` to the example connector configuration so it matches the schema.

## Review Notes
- The `amqplib` publisher uses `channel.publish` without publisher confirms (`channel.confirmSelect()` / waiting for an `ack`). This means the DB row can be marked `published_at = NOW()` before the broker has actually acknowledged the message. The post correctly acknowledges this by recommending idempotent consumers, but a future revision could mention `confirmChannel` for stronger delivery guarantees.
- The example does not call `channel.assertExchange('events', 'topic', { durable: true })`. In a runnable example you would need to declare the exchange before publishing. This was left as-is since the focus of the post is the outbox pattern, not RabbitMQ topology setup.
- `gen_random_uuid()` is built into PostgreSQL 13+. On earlier versions it requires the `pgcrypto` extension. The post implicitly targets PG 13+, which is reasonable in 2026 but worth noting.
- `database.server.name` in the Debezium config is the older property name; Debezium 2.0+ renamed this to `topic.prefix`. Both still work in current versions (the legacy name is honored), so the example is not wrong, but a future update could switch to `topic.prefix` for newer deployments.
- The `cleanupOutbox` job uses `setInterval` and interpolates an integer constant (`RETENTION_DAYS`) directly into the SQL string. Since the value is a hard-coded constant, this is not a SQL-injection risk, just a stylistic note.
