# Validation Summary: How to Build a Change Data Capture Pipeline with Debezium and ClickHouse

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- ClickHouse (Kafka Engine, ReplacingMergeTree, Materialized Views, JSON functions)
- Debezium (PostgreSQL connector, Kafka Connect)
- Apache Kafka
- PostgreSQL (Write-Ahead Log, logical replication via `pgoutput`)

## Sources Consulted
- Debezium PostgreSQL connector reference (stable): https://debezium.io/documentation/reference/stable/connectors/postgresql.html
- Debezium 2.0 release notes (for the `database.server.name` → `topic.prefix` rename)
- ClickHouse Kafka engine documentation: https://clickhouse.com/docs/en/engines/table-engines/integrations/kafka
- ClickHouse `JSONAsString` format docs: https://clickhouse.com/docs/en/interfaces/formats#jsonasstring
- ClickHouse `ReplacingMergeTree` engine docs: https://clickhouse.com/docs/en/engines/table-engines/mergetree-family/replacingmergetree
- ClickHouse JSON extraction function reference (`JSONExtractUInt`, `JSONExtractRaw`, `JSONExtractString`)
- Debezium temporal type mapping (`io.debezium.time.MicroTimestamp` for PostgreSQL `timestamp`)

## Issues Found

1. **Deprecated Debezium property `database.server.name`** — The connector config used `database.server.name`, which was removed in Debezium 2.0 (October 2022) and replaced by `topic.prefix`. On Debezium 2.x this fails validation. Replaced with `"topic.prefix": "prod_pg"`.

2. **Kafka engine table missing column definition** — The `CREATE TABLE orders_cdc_queue ENGINE = Kafka ...` statement had no column list. ClickHouse's Kafka engine requires a column definition block; the statement as written would fail to parse. Added `(raw String)`.

3. **Incorrect `kafka_format` for whole-message-as-string pattern** — The post set `kafka_format = 'JSONEachRow'`, but the downstream materialized view consumes the entire message as a single `raw` column via `JSONExtractRaw(raw, 'after')`. `JSONEachRow` parses each JSON object into named columns and cannot populate a single `raw` column. Changed to `kafka_format = 'JSONAsString'`, which is the format documented for a single-String-column table receiving full JSON messages.

## Review Notes
- `ReplacingMergeTree(updated_at)` with a version column is valid; the post's approach of carrying a `_deleted` flag and filtering with `WHERE _deleted = 0` works, but newer ClickHouse versions also support `ReplacingMergeTree(ver, is_deleted)` which lets the engine physically drop deleted rows during merges. Worth mentioning as a future enhancement.
- `FINAL` is correct for deduplicated reads but has a known performance cost; for high-QPS analytics, the common pattern is a `SELECT ... argMax(...) GROUP BY pk` query or a `ReplicatedReplacingMergeTree` with `OPTIMIZE ... FINAL` scheduled jobs.
- Debezium timestamp handling (microseconds since epoch, divided by 1,000,000 for `fromUnixTimestamp`) is correct for PostgreSQL `timestamp` columns under the default `time.precision.mode=adaptive`. If the mode is changed to `connect`, the divisor would need to change to 1,000.
- `toUInt64(JSONExtractUInt(...))` is a no-op wrap since `JSONExtractUInt` already returns `UInt64`; harmless but redundant.
- `JSONExtractUInt`, `JSONExtractRaw`, and `JSONExtractString` are all current and supported.
