# Validation Summary: How to Use ClickHouse with Loki Query Patterns

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- ClickHouse (MergeTree engine, DateTime64, LowCardinality, Map type, tokenbf_v1 skip index, CODEC compression, TTL, toStartOfInterval)
- Grafana Loki (LogQL query patterns: label filtering, line filter `|=`, `rate()` aggregation)
- SQL

## Sources Consulted
- ClickHouse DateTime64 documentation: https://clickhouse.com/docs/sql-reference/data-types/datetime64
- ClickHouse compression codecs (Delta, ZSTD): https://clickhouse.com/docs/data-compression/compression-in-clickhouse
- ClickHouse CREATE TABLE codec syntax: https://clickhouse.com/docs/sql-reference/statements/create/table
- ClickHouse schema design for observability (Map type with CODEC): https://clickhouse.com/docs/use-cases/observability/schema-design
- ClickHouse data skipping indexes (tokenbf_v1): https://clickhouse.com/docs/optimize/skipping-indexes/examples
- ClickHouse MergeTree TTL: https://clickhouse.com/docs/engines/table-engines/mergetree-family/mergetree
- ClickHouse date-time functions (toStartOfInterval, now): https://clickhouse.com/docs/sql-reference/functions/date-time-functions
- ClickHouse string search functions (ILIKE): https://clickhouse.com/docs/sql-reference/functions/string-search-functions
- ClickHouse LowCardinality type: https://clickhouse.com/docs/sql-reference/data-types/lowcardinality
- Grafana Loki LogQL documentation: https://grafana.com/docs/loki/latest/query/

## Issues Found
No technical issues found.

## Review Notes
- The `ALTER TABLE ... ADD INDEX` for `tokenbf_v1` is correct, but readers should be aware that after adding a skip index to an existing table with data, `ALTER TABLE logs MATERIALIZE INDEX idx_message` must be run to apply the index to existing data parts. New inserts will use the index automatically. The post focuses on schema setup so this omission is acceptable but worth noting.
- The queries use `now()` which returns `DateTime` (second precision), while the `timestamp` column is `DateTime64(9)` (nanosecond precision). ClickHouse handles this correctly via implicit type promotion. For explicit type matching, `now64(9)` could be used instead, but this is a stylistic preference, not an error.
- All Loki LogQL syntax examples (`{service="payment", level="error"}`, `{service="api"} |= "timeout"`, `rate({service="api", level="error"}[5m])`) are accurate representations of LogQL patterns.
- The `DateTime64(9)` precision (nanoseconds) limits the maximum representable timestamp to 2262-04-11, which is fine for log storage use cases.
