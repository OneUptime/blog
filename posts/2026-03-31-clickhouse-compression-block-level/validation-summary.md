# Validation Summary: How ClickHouse Compression Works at the Block Level

## Status
validated

## Post Type
Tutorial / Reference guide

## Technologies Covered
- ClickHouse (columnar storage, MergeTree)
- Compression codecs: LZ4, ZSTD, Delta, DoubleDelta, Gorilla, T64
- SQL (CREATE TABLE, ALTER TABLE, system tables)
- ClickHouse server configuration (config.xml)

## Sources Consulted
- ClickHouse system.columns documentation: https://clickhouse.com/docs/en/operations/system-tables/columns
- ClickHouse column compression codecs documentation: https://clickhouse.com/docs/en/sql-reference/statements/create/table#column_compression_codec
- ClickHouse server compression settings documentation: https://clickhouse.com/docs/en/operations/server-configuration-parameters/settings#compression
- ClickHouse MergeTree settings documentation: https://clickhouse.com/docs/en/operations/settings/merge-tree-settings

## Issues Found
- **Fixed-size compression blocks claim**: The post stated "ClickHouse compresses data in fixed-size 'compression blocks' (default 64 KB of uncompressed data)." Compression blocks are not fixed-size. They range between `min_compress_block_size` (default 64 KiB) and `max_compress_block_size` (default 1 MiB). Updated the wording to describe the variable range and reference both settings.

## Review Notes
- The `system.columns` query uses `column` as a field, which is a valid alias for `name` in that table, so the query works correctly.
- T64 is described as transposing 64 integers; the official docs describe it as cropping unused high bits from integer data types. Both descriptions are reasonable — T64 performs bitwise transposition across 64-value chunks to effectively remove unused high bits, so the post's description is acceptable.
- LZ4 is the default compression method in self-managed ClickHouse; ZSTD is the default in ClickHouse Cloud. The post's characterization of LZ4 as a "good default" is consistent with self-managed defaults.
- The `OPTIMIZE TABLE ... FINAL` statement is one correct way to rewrite existing parts with a new codec. Natural background merges or explicit mutations can also do this, but the simplification is acceptable for a tutorial.
- ZSTD level range (1–22, default 1) and the config.xml `<compression><case><method>...</method><level>...</level></case></compression>` format are verified correct.
