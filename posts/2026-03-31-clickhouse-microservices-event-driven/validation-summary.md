# Validation Summary: How to Use ClickHouse in a Microservices Event-Driven Architecture

## Status
validated

## Post Type
Tutorial / Architecture Guide

## Technologies Covered
- ClickHouse (MergeTree engine, Kafka table engine, Materialized Views, JSONExtract functions)
- Apache Kafka (as the event bus / message broker)
- SQL (DDL and analytical queries)

## Sources Consulted
- ClickHouse Kafka Table Engine documentation: https://clickhouse.com/docs/engines/table-engines/integrations/kafka
- ClickHouse system.kafka_consumers documentation: https://clickhouse.com/docs/operations/system-tables/kafka_consumers
- ClickHouse JSONAsString format documentation: https://clickhouse.com/docs/interfaces/formats/JSONAsString
- ClickHouse JSONEachRow format documentation: https://clickhouse.com/docs/interfaces/formats/JSONEachRow
- ClickHouse Kafka integration guide: https://clickhouse.com/docs/integrations/kafka/kafka-table-engine

## Issues Found

### 1. Kafka engine table missing column definitions
**What was wrong:** The `CREATE TABLE order_events_kafka` statement had no column definitions. ClickHouse requires column definitions for all `CREATE TABLE` statements, including Kafka engine tables.
**What was changed:** Added the full column list (`event_time DateTime, order_id UUID, user_id UInt64, status LowCardinality(String), amount_cents UInt64, currency LowCardinality(String)`) to the Kafka table definition.
**Why:** Without column definitions, the `CREATE TABLE` statement is invalid SQL and would fail.

### 2. Schema evolution section used wrong Kafka format for raw JSON access
**What was wrong:** The section used `JSONExtractString(raw, ...)` to parse fields from a `raw` column, but the Kafka table was defined with `kafka_format = 'JSONEachRow'`. The `JSONEachRow` format maps JSON keys directly to named columns — there is no `raw` column available.
**What was changed:** Added a separate Kafka table definition (`order_events_kafka_raw`) using `kafka_format = 'JSONAsString'` with a single `raw String` column. Updated the explanatory text to mention `JSONAsString`. Removed the unnecessary subquery wrapper `FROM (SELECT * FROM ...)`.
**Why:** To use `JSONExtract` functions on the raw message, you must use the `JSONAsString` format which stores the entire JSON message as a single string column.

### 3. system.kafka_consumers query used incorrect column names
**What was wrong:** The query referenced columns `topic`, `partition`, `offset`, and `consumer_group`, none of which exist in `system.kafka_consumers`.
**What was changed:** Replaced with the correct column names: `database`, `table`, `consumer_id`, `assignments.topic`, `assignments.partition_id`, and `assignments.current_offset`.
**Why:** The actual table uses nested Array columns under the `assignments` prefix, and identifies consumers by `database`/`table`/`consumer_id` rather than a `consumer_group` column.

## Review Notes
- The cross-service analytics JOIN query is correct ClickHouse SQL. The use of `countIf`, `LEFT JOIN`, and `HAVING` are all valid.
- The MergeTree table definitions with `PARTITION BY toYYYYMM()` and compound `ORDER BY` keys are idiomatic ClickHouse.
- The materialized view `TO target_table AS SELECT ... FROM kafka_table` pattern is the standard documented approach for Kafka-to-MergeTree pipelines.
- The post presents both a simple approach (JSONEachRow with typed columns) and a flexible approach (JSONAsString with JSONExtract). Readers should note these are alternative patterns — using both simultaneously on the same topic would create duplicate consumers.
