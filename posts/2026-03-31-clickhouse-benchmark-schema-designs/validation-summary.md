# Validation Summary: How to Benchmark Different Schema Designs in ClickHouse

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- ClickHouse
- MergeTree table engine
- ClickHouse SQL (CREATE TABLE, INSERT, SELECT)
- LowCardinality data type
- Column compression codecs (Delta, ZSTD, LZ4)
- `system.query_log` and `system.parts` system tables
- Partitioning (`toYYYYMM`) and ORDER BY key design

## Sources Consulted
- ClickHouse CREATE TABLE documentation: https://clickhouse.com/docs/en/sql-reference/statements/create/table
- ClickHouse MergeTree engine: https://clickhouse.com/docs/en/engines/table-engines/mergetree-family/mergetree
- ClickHouse column compression codecs: https://clickhouse.com/docs/en/sql-reference/statements/create/table#column-compression-codecs
- ClickHouse LowCardinality: https://clickhouse.com/docs/en/sql-reference/data-types/lowcardinality
- ClickHouse `system.query_log`: https://clickhouse.com/docs/en/operations/system-tables/query_log
- ClickHouse `system.parts`: https://clickhouse.com/docs/en/operations/system-tables/parts
- ClickHouse `rand()`, `substring`, `formatReadableSize`, `toYYYYMM`, `toDate` function docs
- ClickHouse array operations (1-based indexing): https://clickhouse.com/docs/en/sql-reference/data-types/array

## Issues Found
No technical issues found.

## Review Notes
- `CREATE TABLE ... AS other_table ENGINE = ... ORDER BY ...` syntax is supported in ClickHouse; engine (including ORDER BY / PARTITION BY) can be overridden when copying structure.
- Array 1-indexing with `[rand() % N + 1]` is correct — ClickHouse arrays are 1-based.
- `rand()` returns UInt32 (max 4294967295), so `rand() / 4294967295 * 1000` correctly produces a Float64 in [0, 1000] range.
- All referenced `system.query_log` columns (`query`, `query_duration_ms`, `read_rows`, `read_bytes`, `memory_usage`, `type`, `event_date`) and `system.parts` columns (`table`, `bytes_on_disk`, `data_uncompressed_bytes`, `active`) are valid.
- The `CODEC(Delta, ZSTD(1))` combination on a DateTime column is a standard and effective pattern.
- The summary mentions "marks read" as a metric; the comparison query shows `read_rows` and `read_bytes`. Users wanting mark-level detail can additionally inspect `system.query_log.result_rows` or enable profile events, but this is a minor detail, not an inaccuracy.
