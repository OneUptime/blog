# Validation Summary: Why You Should Avoid Nullable Columns When Possible in ClickHouse

## Status
validated

## Post Type
Guide

## Technologies Covered
- ClickHouse (MergeTree engine, Nullable types, Map type)
- SQL (DDL, DML, ALTER TABLE mutations)

## Sources Consulted
- ClickHouse Nullable(T) data type docs: https://clickhouse.com/docs/sql-reference/data-types/nullable
- ClickHouse best practices — avoid Nullable columns: https://clickhouse.com/docs/en/cloud/bestpractices/avoid-nullable-columns
- ClickHouse native protocol column types: https://clickhouse.com/docs/native-protocol/columns
- ClickHouse MergeTree engine docs (ORDER BY / primary key restrictions): https://clickhouse.com/docs/engines/table-engines/mergetree-family/mergetree
- ClickHouse ALTER TABLE column manipulations: https://clickhouse.com/docs/sql-reference/statements/alter/column
- ClickHouse system.parts table: https://clickhouse.com/docs/operations/system-tables/parts
- ClickHouse system.columns table: https://clickhouse.com/docs/operations/system-tables/columns
- ClickHouse functions for Nullable values (coalesce): https://clickhouse.com/docs/sql-reference/functions/functions-for-nulls
- ClickHouse Map(K, V) data type: https://clickhouse.com/docs/sql-reference/data-types/map

## Issues Found
1. **Null map size per row was incorrect**: The post stated the null map is "one bit per row" but ClickHouse stores the null mask as a `UInt8` column, which is **one byte per row**. This is a meaningful factual error that understates the storage overhead by 8x. Changed "A null map bitmap (one bit per row indicating NULL or not)" to "A null map (one byte per row, stored as UInt8, indicating NULL or not)".

2. **Nullable in ORDER BY / primary key is not absolutely forbidden**: The post stated Nullable columns "cannot" be in ORDER BY / primary key, implying it is impossible. In reality, ClickHouse allows this when the `allow_nullable_key` setting is enabled (it is off by default). Updated the comment to note this is the default behavior and that `allow_nullable_key` can override it.

## Review Notes
- The `system.parts` query for comparing storage shows part-level sizes rather than per-column sizes. Using `system.parts_columns` with `column_data_compressed_bytes` / `column_data_uncompressed_bytes` grouped by column would more directly demonstrate the storage difference between nullable and non-nullable columns. Not changed since the existing query is not incorrect, just less targeted.
- The migration section uses `WHERE 1` as the always-true condition for mutations, which is idiomatic ClickHouse. Some users may prefer `WHERE true` but both work.
