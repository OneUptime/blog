# Validation Summary: How to Use Gorilla Codec in ClickHouse for Float Data

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- ClickHouse
- Gorilla compression codec
- Delta / DoubleDelta codecs
- LZ4 / ZSTD general-purpose compression
- MergeTree table engine
- `system.parts` and `system.columns` system tables

## Sources Consulted
- ClickHouse docs — Column Compression Codecs: https://clickhouse.com/docs/en/sql-reference/statements/create/table#column-compression-codecs
- ClickHouse docs — Specialized Codecs (Gorilla, Delta, DoubleDelta, T64): https://clickhouse.com/docs/en/sql-reference/statements/create/table#specialized-codecs
- ClickHouse docs — `system.parts`: https://clickhouse.com/docs/en/operations/system-tables/parts
- ClickHouse docs — `system.columns`: https://clickhouse.com/docs/en/operations/system-tables/columns
- ClickHouse docs — `ALTER TABLE ... MODIFY COLUMN`: https://clickhouse.com/docs/en/sql-reference/statements/alter/column
- Facebook Gorilla paper: "Gorilla: A Fast, Scalable, In-Memory Time Series Database" (VLDB 2015)

## Issues Found
No technical issues found.

Verified items:
- `CODEC(Gorilla, LZ4)` / `CODEC(Gorilla, ZSTD)` syntax is valid and Gorilla is typically paired with a general-purpose codec as stated.
- Gorilla is correctly described as XOR-based delta compression derived from Facebook's Gorilla TSDB.
- `CODEC(Delta, LZ4)` on DateTime / DateTime64 and `CODEC(DoubleDelta, LZ4)` on UInt64 timestamps are valid patterns.
- `ALTER TABLE ... MODIFY COLUMN ... CODEC(...)` followed by `OPTIMIZE TABLE ... FINAL` is the correct way to apply/recompress a codec on existing data.
- `system.parts` columns `data_compressed_bytes`, `data_uncompressed_bytes`, `active`, `database`, `table` all exist and behave as used.
- `system.columns` columns `column`, `type`, `compression_codec`, `database`, `table` all exist.
- `formatReadableSize`, `now()`, `numbers()`, `sin()` are all standard ClickHouse functions used correctly.

## Review Notes
- The compression comparison query aggregates all columns of each table (both `ts` and `value`), not just the float column. Since the two test tables have identical schemas except for the codec on `value`, the comparison is still meaningful, but readers should be aware the ratio reflects total-table compression, not isolated `value`-column compression. Not a technical error — just a caveat.
- The "2-5x" compression improvement figure in the summary is a reasonable ballpark that matches commonly reported Gorilla results, though actual ratios depend heavily on data characteristics.
- Gorilla in ClickHouse actually accepts any fixed-width type (not just floats), though it's designed for and most effective on floating-point data as the post describes.
