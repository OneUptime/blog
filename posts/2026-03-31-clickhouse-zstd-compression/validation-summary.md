# Validation Summary: How to Use ZSTD Compression in ClickHouse

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- ClickHouse (MergeTree engine)
- ZSTD (Zstandard) compression algorithm
- LZ4 compression algorithm
- SQL (ClickHouse dialect)

## Sources Consulted
- ClickHouse MergeTree table settings documentation — https://clickhouse.com/docs/operations/settings/merge-tree-settings
- ClickHouse CREATE TABLE documentation (codec syntax and ZSTD level defaults) — https://clickhouse.com/docs/sql-reference/statements/create/table
- ClickHouse compression overview — https://clickhouse.com/docs/data-compression/compression-in-clickhouse
- ClickHouse system.columns table documentation — https://clickhouse.com/docs/operations/system-tables/columns
- ClickHouse system.parts table documentation — https://clickhouse.com/docs/operations/system-tables/parts
- ClickHouse random functions documentation — https://clickhouse.com/docs/sql-reference/functions/random-functions

## Issues Found
1. **Incorrect table-level setting name**: The post used `SETTINGS compression_codec = 'ZSTD'` but the correct MergeTree setting is `default_compression_codec`. Changed to `SETTINGS default_compression_codec = 'ZSTD'` and updated the surrounding description text.
2. **Wrong default ZSTD level**: The compression level table stated that level 3 is "Default when no level is specified." In ClickHouse, the default ZSTD level is 1, not 3 (the zstd library's default is 3, but ClickHouse overrides this to 1). Corrected the table so level 1 is marked as the default and level 3 is described as "Good balance of speed and compression."

## Review Notes
- The `randomString(length)` function used in the benchmark section generates random bytes, not printable ASCII. For more readable output, `randomPrintableASCII(length)` could be used instead, but `randomString` is valid and sufficient for a compression benchmark.
- All SQL queries against `system.columns` and `system.parts` use correct column names and are syntactically valid.
- The `ALTER TABLE ... MODIFY COLUMN` and `OPTIMIZE TABLE ... FINAL` commands are correct for recompressing existing data.
- The advice about combining Delta/DoubleDelta codecs with LZ4 or ZSTD for numeric columns is accurate.
