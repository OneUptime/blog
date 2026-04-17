# Validation Summary: How to Choose the Right Compression Codec in ClickHouse

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- ClickHouse (compression codecs, MergeTree engine, system tables)
- SQL (DDL/DML for ClickHouse)
- Compression codecs: LZ4, LZ4HC, ZSTD, Delta, DoubleDelta, Gorilla, T64, NONE

## Sources Consulted
- ClickHouse official documentation on column compression codecs (https://clickhouse.com/docs/en/sql-reference/statements/create/table#column_compression_codec)
- ClickHouse `system.parts` documentation (https://clickhouse.com/docs/en/operations/system-tables/parts)
- ClickHouse `system.columns` documentation (https://clickhouse.com/docs/en/operations/system-tables/columns)
- ClickHouse TTL expression docs (https://clickhouse.com/docs/en/engines/table-engines/mergetree-family/mergetree#table_engine-mergetree-ttl)
- ClickHouse DateTime64 docs (https://clickhouse.com/docs/en/sql-reference/data-types/datetime64)

## Issues Found
No technical issues found.

Verified:
- Codec names and classification (Compressor vs Transform) are correct.
- `Delta(4)` is valid for `DateTime` (4-byte type); `Delta(8)` valid for `UInt64`.
- `DoubleDelta` is appropriate for evenly-spaced integer/timestamp sequences.
- `Gorilla` is appropriate for smooth Float32/Float64 series.
- `T64` is valid for integer and Enum columns.
- `system.parts` columns (`table`, `database`, `active`, `data_compressed_bytes`, `data_uncompressed_bytes`) are all valid.
- `system.columns` columns (`name`, `type`, `compression_codec`, `data_compressed_bytes`, `data_uncompressed_bytes`) are all valid.
- `ZSTD(3)` / `ZSTD(6)` are within the valid 1-22 range.
- `TTL ts + INTERVAL 90 DAY DELETE` is valid syntax (DELETE is the default action).
- Transform + compressor chaining like `CODEC(Delta(4), LZ4)` follows the documented pattern.
- `DateTime64(3)` correctly denotes millisecond precision.
- `CODEC(NONE)` is a valid way to disable compression.

## Review Notes
- The claim "reduce storage by 5-20x compared to using plain LZ4 everywhere" is workload-dependent; for the specific data types in the post (timestamps, smooth floats, low-cardinality integers) it is a reasonable upper bound but readers should validate with the `system.columns` query provided.
- ClickHouse's built-in default level for `ZSTD()` when no argument is supplied is 1, not 3. The post correctly uses explicit `ZSTD(3)` throughout, so there is no inaccuracy, but readers should be aware that unparameterized `ZSTD` defaults to level 1.
- In newer ClickHouse versions Gorilla also accepts same-width integer types (not just floats); the post's float-only framing is conservative but not wrong.
- The decision tree recommends `Delta + LZ4` for monotonic integers without specifying `delta_bytes`; this is fine because Delta defaults to the column's native type size.
