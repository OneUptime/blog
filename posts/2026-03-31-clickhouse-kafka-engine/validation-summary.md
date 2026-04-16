# Validation Summary: How to Use Kafka Table Engine in ClickHouse

## Status
validated

## Post Type
Tutorial / Technical Guide

## Technologies Covered
- ClickHouse (Kafka table engine, MergeTree engine, Materialized Views, system.kafka_consumers)
- Apache Kafka (topics, consumer groups, offsets, high watermark)
- Kafka CLI tools (`kafkacat`/`kcat`, `kafka-console-producer`, `kafka-consumer-groups.sh`)
- ClickHouse SQL (JSONExtractString, parseDateTime, LowCardinality, virtual columns, formats: JSONEachRow, JSONAsString)

## Sources Consulted
- ClickHouse Kafka table engine docs: https://clickhouse.com/docs/en/engines/table-engines/integrations/kafka
- ClickHouse `system.kafka_consumers` docs: https://clickhouse.com/docs/en/operations/system-tables/kafka_consumers
- ClickHouse Formats reference: https://clickhouse.com/docs/en/interfaces/formats
- ClickHouse `JSONAsString` format docs: https://clickhouse.com/docs/en/interfaces/formats/JSONAsString

## Issues Found

1. **Virtual columns declared in `CREATE TABLE kafka_multi_topic`.** The post declared `_topic`, `_partition`, and `_offset` as regular columns. Per ClickHouse Kafka engine documentation, these are virtual columns automatically provided by the engine and must NOT be declared in the schema — doing so would turn them into ordinary columns that the format parser would try to read from the message payload. Fix: removed them from the `CREATE TABLE` and clarified in the explanatory paragraph that virtual columns are referenced directly in queries without being declared.

2. **Nonexistent `high_watermark` field in `system.kafka_consumers` query.** The monitoring query referenced `assignments.high_watermark`, which does not exist. The nested `assignments` column only provides `topic`, `partition_id`, and `current_offset` (plus `intent_size`). Fix: removed the `high_watermark`/`lag` columns, replaced them with real fields (`num_messages_read`, `last_poll_time`, `last_commit_time`), and added a note explaining that broker-side high watermarks must be obtained via `kafka-consumer-groups.sh --describe` or by parsing `rdkafka_stat`.

3. **DLQ materialized view referenced a nonexistent column.** The `mv_kafka_errors` view selected `raw_message` from `kafka_raw_events`, but `kafka_raw_events` was defined earlier with typed columns (`event_time`, `user_id`, etc.) — it has no `raw_message` column, so the view would fail to create. Fix: changed the source table to `kafka_raw_logs` (which was defined earlier with a single `raw_message String` column) and updated the filter predicate to match that schema.

4. **Incorrect `RawBLOB` format for a single-String-column Kafka table.** `RawBLOB` treats input as a single opaque BLOB and is not the idiomatic choice for storing one JSON message per row. ClickHouse provides `JSONAsString` specifically for this use case — "a single JSON object is interpreted as a single value" into a single `String` field. Fix: changed `kafka_format = 'RawBLOB'` to `kafka_format = 'JSONAsString'`.

## Review Notes
- The main Kafka engine settings (`kafka_broker_list`, `kafka_topic_list`, `kafka_group_name`, `kafka_format`, `kafka_num_consumers`, `kafka_max_block_size`) and their semantics are accurate.
- The MergeTree + Materialized View + Kafka engine three-table pattern is described correctly and is the canonical ClickHouse streaming ingestion recipe.
- The `parseDateTime` MySQL-style format specifiers (`%Y-%m-%dT%H:%i:%s`) are correct for ClickHouse.
- `kafkacat` was renamed to `kcat` upstream; the post still uses the older name, which is functionally identical for most distributions but may be worth noting for readers on newer systems.
- The DLQ pattern shown only catches semantic/application-level validation failures (missing field), not true Kafka format parse errors. For true parse errors, readers should look into `kafka_handle_error_mode='stream'` combined with the virtual columns `_raw_message` and `_error`. This is an enhancement opportunity rather than a correctness issue.
- The post does not specify a ClickHouse version; the verified behavior matches 23.x+ / 24.x current documentation.
