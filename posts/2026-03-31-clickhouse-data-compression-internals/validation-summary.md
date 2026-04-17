# Validation Summary: How ClickHouse Handles Data Compression

## Status
validated

## Post Type
Tutorial / Reference guide

## Technologies Covered
- ClickHouse (MergeTree engine)
- Compression codecs: LZ4, LZ4HC, ZSTD, NONE
- Encoding codecs: Delta, DoubleDelta, Gorilla, T64
- LowCardinality data type (dictionary encoding)
- `system.columns` and `system.mutations` system tables
- `ALTER TABLE ... MODIFY COLUMN ... CODEC(...)` DDL

## Sources Consulted
- ClickHouse CREATE TABLE / column codecs: https://clickhouse.com/docs/sql-reference/statements/create/table
- ClickHouse ALTER COLUMN: https://clickhouse.com/docs/sql-reference/statements/alter/column
- LowCardinality data type: https://clickhouse.com/docs/sql-reference/data-types/lowcardinality
- system.columns: https://clickhouse.com/docs/operations/system-tables/columns
- system.mutations: https://clickhouse.com/docs/operations/system-tables/mutations

## Issues Found
One issue was found and fixed:

- **Invalid `ORDER BY` reference in LowCardinality example**: The `CREATE TABLE events` example in the "LowCardinality - Dictionary Encoding" section used `ORDER BY event_time`, but the table definition did not declare an `event_time` column — the statement would fail at parse time. Fixed by adding an `event_time DateTime` column to the table definition so the `ORDER BY` clause resolves correctly. This also matches the idiomatic shape of time-series tables shown elsewhere in the post.

All other technical claims verified against official ClickHouse documentation:
- LZ4 is the default compression codec.
- Codec chaining `CODEC(<encoding>, <compression>)` is valid; encoding codecs (Delta, DoubleDelta, Gorilla, T64) are "data preparation" codecs applied before byte compression (LZ4, LZ4HC, ZSTD, NONE).
- ZSTD supports levels 1-22.
- `data_compressed_bytes` and `data_uncompressed_bytes` are valid columns on `system.columns`.
- `system.mutations` exposes `table`, `command`, `is_done`, and `parts_to_do`.
- `ALTER TABLE ... MODIFY COLUMN ... CODEC(...)` is valid and applies via mutation that rewrites parts.
- LowCardinality provides dictionary encoding, with strongest gains on low-cardinality strings.
- DoubleDelta is appropriate for timestamps; Gorilla (from the Facebook paper) is appropriate for float time-series values.

## Review Notes
- Compression ratio numbers in the "Codec Reference" table are presented as typical/rough gains — real-world numbers are highly data-dependent, but the stated order-of-magnitude values are consistent with commonly cited benchmarks.
- The post omits `ZSTD_QAT` and `DEFLATE_QPL` (hardware-accelerated compression codecs introduced in recent ClickHouse versions), as well as `FPC` for Float64. This is fine for an introductory post; future revisions could mention them.
- Default ZSTD level in ClickHouse is 1 (not 3); the post does not claim otherwise but readers should know `CODEC(ZSTD)` without a level argument yields level 1.
