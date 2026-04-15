# Validation Summary: How to Build a Streaming ETL Pipeline into ClickHouse

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- ClickHouse (Kafka table engine, MergeTree engine, materialized views)
- Apache Kafka
- ClickHouse JSON functions (JSONExtractString, JSONExtractInt, JSONExtractFloat)
- ClickHouse LowCardinality and Decimal data types

## Sources Consulted
- ClickHouse Kafka Table Engine documentation: https://clickhouse.com/docs/engines/table-engines/integrations/kafka
- ClickHouse JSON Functions documentation: https://clickhouse.com/docs/sql-reference/functions/json-functions
- ClickHouse RawBLOB / JSONAsString format docs: https://clickhouse.com/docs/interfaces/formats/RawBLOB
- ClickHouse CREATE VIEW (materialized views): https://clickhouse.com/docs/sql-reference/statements/create/view
- ClickHouse Decimal types: https://clickhouse.com/docs/sql-reference/data-types/decimal
- ClickHouse Nullable functions (coalesce, nullIf): https://clickhouse.com/docs/sql-reference/functions/functions-for-nulls
- ClickHouse ALTER TABLE column manipulations: https://clickhouse.com/docs/sql-reference/statements/alter/column
- ClickHouse DROP statements: https://clickhouse.com/docs/sql-reference/statements/drop
- ClickHouse date-time functions (toStartOfMinute): https://clickhouse.com/docs/sql-reference/functions/date-time-functions

## Issues Found

### 1. Dead Letter Queue pattern was fundamentally broken (High severity)
- **What was wrong:** The blog used a standalone `INSERT INTO etl_errors SELECT ... FROM raw_events_queue` to route failed records to an error table. A direct SELECT from a Kafka engine table consumes messages independently, competing with the materialized view for offsets. Messages read by the INSERT would not also be seen by the main ETL materialized view, causing data loss.
- **What was changed:** Replaced with the correct pattern: set `kafka_handle_error_mode = 'stream'` on the Kafka table, then create a second materialized view (`etl_errors_mv`) that filters on `_error != ''` and writes `_raw_message` and `_error` virtual columns to the error table. Multiple materialized views on the same Kafka table each receive copies of all records.
- **Why:** ClickHouse's Kafka engine advances consumer offsets on read. Only materialized views attached to a Kafka table receive copies of all records; standalone SELECTs consume messages destructively.

### 2. coalesce with JSONExtractString would not trigger fallback (Medium severity)
- **What was wrong:** `coalesce(JSONExtractString(raw_data, 'app_version'), 'unknown')` — `JSONExtractString` returns an empty string `''` (not NULL) when a key is missing, so `coalesce` would never return `'unknown'`.
- **What was changed:** Wrapped with `nullIf` to convert empty string to NULL: `coalesce(nullIf(JSONExtractString(raw_data, 'app_version'), ''), 'unknown')`.
- **Why:** `coalesce` only replaces NULL values, not empty strings. `nullIf` converts `''` to NULL so the fallback works as intended.

### 3. RawBLOB changed to JSONAsString for Kafka format (Low severity)
- **What was wrong:** `kafka_format = 'RawBLOB'` is technically valid but not idiomatic. `RawBLOB` is designed for binary data and reads all input into a single value. For JSON message ingestion, `JSONAsString` is the standard recommended format in ClickHouse documentation and examples.
- **What was changed:** Changed `kafka_format` from `'RawBLOB'` to `'JSONAsString'`.
- **Why:** `JSONAsString` is specifically designed for the use case of ingesting raw JSON strings for later processing with `JSONExtract*` functions, and is the format used in ClickHouse's own Kafka integration examples.

## Review Notes
- The `DROP VIEW etl_raw_to_events` command in Step 4 is correct but `DROP VIEW IF EXISTS` would be more defensive for production use.
- The `kafka_num_consumers = 4` setting should not exceed the number of partitions in the Kafka topic; the blog could mention this constraint.
- The monitoring query in the final section is correct and useful; `toStartOfMinute`, `count()`, and `uniq()` are all valid ClickHouse functions.
- All other SQL syntax (CREATE TABLE, ALTER TABLE, MergeTree engine, PARTITION BY, ORDER BY, LowCardinality, Decimal types, DEFAULT expressions) is correct.
