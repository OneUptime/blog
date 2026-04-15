# Validation Summary: How to Connect ClickHouse to RabbitMQ

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- ClickHouse (RabbitMQ table engine, MergeTree, materialized views)
- RabbitMQ (AMQP broker, exchanges, queues, routing keys)
- Python (pika library for AMQP publishing)
- RabbitMQ Management HTTP API

## Sources Consulted
- ClickHouse RabbitMQ table engine documentation: https://clickhouse.com/docs/engines/table-engines/integrations/rabbitmq
- ClickHouse type conversion functions documentation: https://clickhouse.com/docs/sql-reference/functions/type-conversion-functions
- RabbitMQ Management HTTP API reference: https://www.rabbitmq.com/docs/management
- Pika (Python AMQP client) documentation: https://pika.readthedocs.io/en/stable/

## Issues Found
1. **`parseDateTimeBestEffort` used instead of `parseDateTime64BestEffort`** — In the materialized view, `parseDateTimeBestEffort(ts)` returns `DateTime` (second precision), but the target column `ts` in `rmq_events` is `DateTime64(3)` (millisecond precision). While ClickHouse can implicitly cast `DateTime` to `DateTime64(3)`, any subsecond precision in the input timestamps would be silently dropped. Changed to `parseDateTime64BestEffort(ts, 3)` to correctly match the target column type and preserve millisecond precision.

## Review Notes
- The manual queue creation step (creating `clickhouse_events` via the RabbitMQ Management API) is somewhat redundant when `rabbitmq_queue_base` is set on the ClickHouse table, since ClickHouse creates and manages its own queues based on that base name. The manually created queue would still receive copies of messages (via the direct exchange binding) but would have no consumer draining it. This isn't an error — the pipeline works correctly because ClickHouse's auto-created queues are also bound to the exchange — but readers should be aware that ClickHouse manages its own queue lifecycle.
- The `rabbitmq_persistent = 1` setting controls delivery mode for messages produced via INSERT into the RabbitMQ table. Since this table is used purely as a consumer (source), the setting has no practical effect. It's not incorrect, just unnecessary for this use case.
- All RabbitMQ Management API curl commands use correct endpoints, HTTP methods, and JSON payloads for the default vhost (`%2F`).
- The Python publishing script correctly uses `pika.DeliveryMode.Persistent` (available in pika 1.2+) and the message schema matches the ClickHouse table columns.
- All ClickHouse SQL syntax (MergeTree settings, TTL, LowCardinality, partition expressions) is correct and current.
