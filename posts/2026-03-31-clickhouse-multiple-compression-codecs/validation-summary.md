# Validation Summary: How to Use Multiple Compression Codecs Together in ClickHouse

## Status
validated

## Post Type
Tutorial / Reference Guide

## Technologies Covered
- ClickHouse (MergeTree engine)
- Compression codecs: Delta, DoubleDelta, Gorilla, LZ4, LZ4HC, ZSTD, NONE
- SQL DDL (CREATE TABLE, ALTER TABLE)
- system.columns introspection table

## Sources Consulted
- ClickHouse Column Compression Codecs documentation: https://clickhouse.com/docs/en/sql-reference/statements/create/table#column-compression-codecs
- ClickHouse ALTER COLUMN documentation: https://clickhouse.com/docs/en/sql-reference/statements/alter/column
- ClickHouse system.columns documentation: https://clickhouse.com/docs/en/operations/system-tables/columns

## Issues Found
- **Triple-codec chain with two general-purpose codecs**: The original post showed `CODEC(DoubleDelta, LZ4HC(9), ZSTD(1))` as a valid triple-codec chain. Chaining two general-purpose codecs (LZ4HC followed by ZSTD) is not a documented or recommended pattern — compressing already-compressed data yields negligible additional compression with extra CPU overhead. Changed the example to `CODEC(DoubleDelta, LZ4HC(9))` and added a note warning against chaining two general-purpose codecs.

## Review Notes
- The `Delta` codec byte-size parameter (e.g., `Delta(4)`, `Delta(8)`) is marked as deprecated in current ClickHouse documentation. Bare `Delta` is preferred as it defaults to `sizeof(type)`. The examples still work but may need updating if this parameter is removed in a future release.
- The `system.columns` query uses `column` as a field name — this works because `column` is an alias for `name` in that system table, though `name` is the canonical field name.
- All other SQL syntax, codec combinations, ZSTD/LZ4HC level parameters, ALTER TABLE syntax, and system table queries were verified as correct.
- The compression ratio claim of "5-20x" in the summary is reasonable for well-chosen codec chains on time-series data, though actual ratios vary widely by data characteristics.
