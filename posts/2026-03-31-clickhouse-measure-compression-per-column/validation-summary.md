# Validation Summary: How to Measure Compression Effectiveness per Column in ClickHouse

## Status
validated

## Post Type
Tutorial / Reference Guide

## Technologies Covered
- ClickHouse (SQL dialect, system tables, compression codecs)
- `system.columns` system table
- `system.parts_columns` system table
- ClickHouse compression codecs: LZ4, ZSTD, Gorilla, Delta

## Sources Consulted
- ClickHouse official documentation: system.columns table — https://clickhouse.com/docs/en/operations/system-tables/columns
- ClickHouse official documentation: system.parts_columns table — https://clickhouse.com/docs/en/operations/system-tables/parts_columns
- ClickHouse official documentation: compression codecs — https://clickhouse.com/docs/en/sql-reference/statements/create/table#column_compression_codec
- ClickHouse official documentation: formatReadableSize function — https://clickhouse.com/docs/en/sql-reference/functions/other-functions#formatreadablesize
- ClickHouse official documentation: ALTER TABLE MODIFY COLUMN — https://clickhouse.com/docs/en/sql-reference/statements/alter/column

## Issues Found
- **`column_name` in `system.parts_columns` query**: The "Cross-Partition Analysis via system.parts_columns" section used `column_name` as the field name and in the `GROUP BY` clause. The correct column name in `system.parts_columns` is `column`, not `column_name`. Changed `column_name` to `column` in both the SELECT and GROUP BY clauses.

## Review Notes
- The `system.columns` queries use `column` as a field name. While `name` is the canonical column name in `system.columns`, `column` works as an alias and is acceptable.
- The "Find Columns with Poor Compression" query uses a SELECT alias (`ratio`) in the WHERE clause. This is valid in ClickHouse (a ClickHouse-specific SQL extension) but would not work in standard SQL. Worth noting for readers coming from other databases.
- The `Delta(4)` parameter syntax in `CODEC(Delta(4), LZ4)` still works but the explicit byte-size parameter for Delta is deprecated in newer ClickHouse versions. Bare `Delta` (which defaults to `sizeof(type)`) is now preferred. The syntax remains functional so this was not changed.
- Division by zero could occur in the ratio calculations if `data_compressed_bytes` is 0 (e.g., for empty columns). This is a minor edge case that does not warrant a change but readers should be aware.
