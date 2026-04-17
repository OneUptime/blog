# Validation Summary: How to Handle Dead Letters in ClickHouse Message Pipelines

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- ClickHouse (Kafka table engine, MergeTree, materialized views, window functions, mutations)
- Apache Kafka
- clickhouse-connect Python client
- kafka-python producer library
- SQL (DDL, DML, window functions)

## Sources Consulted
- ClickHouse Kafka engine documentation: https://clickhouse.com/docs/en/engines/table-engines/integrations/kafka
- ClickHouse `kafka_handle_error_mode` settings and virtual columns reference
- ClickHouse MergeTree engine docs: https://clickhouse.com/docs/en/engines/table-engines/mergetree-family/mergetree
- ClickHouse window functions docs: https://clickhouse.com/docs/en/sql-reference/window-functions
- ClickHouse `ALTER TABLE ... UPDATE` mutations docs: https://clickhouse.com/docs/en/sql-reference/statements/alter/update
- clickhouse-connect Python driver docs: https://clickhouse.com/docs/en/integrations/python
- kafka-python producer docs: https://kafka-python.readthedocs.io/

## Issues Found
- **Incorrect Kafka virtual column name**: The materialized view `dead_letter_parse_errors_mv` referenced `_partition_id` as the Kafka partition virtual column. The correct virtual column name exposed by the ClickHouse Kafka engine is `_partition` (UInt64). Fixed by replacing `_partition_id AS source_partition` with `_partition AS source_partition`.

## Review Notes
- `kafka_handle_error_mode` actually supports three values in recent ClickHouse versions: `default`, `stream`, and `dead_letter_queue`. The post uses `stream` mode, which is correct and well-supported. Future revisions could mention the newer `dead_letter_queue` mode that routes errors to a built-in `system.dead_letter_queue` table, offering an alternative to custom DLQ tables.
- The `source_partition` column is declared as `UInt32` in the `dead_letters` table while the virtual column `_partition` is `UInt64`. ClickHouse normally handles implicit narrowing when values fit, but an explicit cast (e.g., `toUInt32(_partition)`) or changing the schema column to `UInt64` would be safer.
- The unused `import json` in the Python replay snippet is a minor stylistic issue, not a technical error.
- The `failed_events_mv` reconstructs the raw message from parsed fields via `concat(...)`, which assumes `user_id` and `event_type` columns exist in the Kafka engine table schema. This is fine for validation failures (where the message parsed successfully but failed business rules).
- The `ALTER TABLE ... UPDATE` mutation is asynchronous in ClickHouse; marking rows as resolved will not happen instantaneously and may take time to materialize depending on part size.
