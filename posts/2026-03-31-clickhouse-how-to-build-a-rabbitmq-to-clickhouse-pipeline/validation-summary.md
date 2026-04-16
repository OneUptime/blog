# Validation Summary: How to Build a RabbitMQ to ClickHouse Pipeline

## Status
validated

## Post Type
Tutorial / How-to Guide

## Technologies Covered
- ClickHouse (RabbitMQ table engine, MergeTree, Materialized Views)
- RabbitMQ (topic exchanges, routing keys, AMQP)
- Python (`pika` client library for AMQP)
- SQL DDL (CREATE TABLE, CREATE MATERIALIZED VIEW, ALTER TABLE)

## Sources Consulted
- ClickHouse RabbitMQ Engine docs: https://clickhouse.com/docs/en/engines/table-engines/integrations/rabbitmq
- ClickHouse GitHub docs source: https://github.com/ClickHouse/ClickHouse/blob/master/docs/en/engines/table-engines/integrations/rabbitmq.md
- ClickHouse MergeTree family docs (TTL, PARTITION BY, ORDER BY semantics)
- RabbitMQ AMQP / topic exchange documentation (routing key behavior)
- `pika` Python client documentation (BlockingConnection, exchange_declare, basic_publish)

## Issues Found

1. **Missing `rabbitmq_exchange_type = 'topic'` in the source table DDL.**
   The Python publisher declares the `analytics_events` exchange as a topic exchange (`exchange_type='topic'`) and publishes with routing keys like `events.purchase`. The ClickHouse RabbitMQ engine defaults `rabbitmq_exchange_type` to `'fanout'`, which ignores routing keys and will also conflict with a pre-existing topic exchange of the same name (RabbitMQ rejects redeclaration with a different type). Added `rabbitmq_exchange_type = 'topic'` to the `SETTINGS` clause in Step 2 so the engine matches the publisher and honors the `rabbitmq_routing_key_list`.

2. **Incorrect monitoring query against `system.kafka_consumers`.**
   The Monitoring section queried `system.kafka_consumers` (Kafka-specific) and hand-waved with "use `system.rabbitmq_consumers` if available". ClickHouse has no `system.rabbitmq_consumers` table, and the Kafka table does not contain RabbitMQ data. Replaced the query with a `system.metrics` lookup filtered on `%RabbitMQ%`, which is the actual way to inspect RabbitMQ engine state in current ClickHouse versions.

3. **Misleading comment about dead-letter routing.**
   The "Handling Message Failures" section claimed that broken messages go to a dead-letter exchange via `rabbitmq_skip_broken_messages`. Per the official docs, that setting only *skips* unparseable messages (a row tolerance per block) and does not forward anything to a DLX. Rewrote the comment to accurately describe the skip behavior and point readers to `rabbitmq_queue_settings_list` with `x-dead-letter-exchange=...` for actual DLX routing.

## Review Notes
- Column names and data types in the `RabbitMQ` source table match the JSON payload keys in the Python publisher (important for `JSONEachRow` format).
- The `MergeTree` target table uses a `MATERIALIZED` column for `event_date` derived from `event_time`, and the `SELECT` in the MV omits it — correct, because materialized columns are computed on insert.
- `ALTER TABLE ... MODIFY SETTING` is supported for RabbitMQ engine tables for the settings shown (`rabbitmq_skip_broken_messages`, `rabbitmq_num_consumers`, `rabbitmq_num_queues`, `rabbitmq_max_block_size`).
- `datetime.utcnow()` is deprecated as of Python 3.12 in favor of `datetime.now(datetime.UTC)`, but still works and produces a compatible `"%Y-%m-%d %H:%M:%S"` string for ClickHouse `DateTime` parsing. Left as-is since this is a quick demo snippet.
- The `<rabbitmq>` block in `config.xml` is optional; the post correctly notes that no special config is required there since connection details are specified per-table.
