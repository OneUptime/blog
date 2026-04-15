# Validation Summary: How to Use Nested Data Type in ClickHouse

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- ClickHouse (Nested data type, MergeTree engine)
- SQL (CREATE TABLE, INSERT, SELECT, ARRAY JOIN, GROUP BY)
- ClickHouse array functions (arrayMap, arrayReduce)

## Sources Consulted
- ClickHouse official documentation on Nested data type: https://clickhouse.com/docs/en/sql-reference/data-types/nested-data-structures/nested
- ClickHouse official documentation on ARRAY JOIN: https://clickhouse.com/docs/en/sql-reference/statements/select/array-join
- ClickHouse official documentation on array functions: https://clickhouse.com/docs/en/sql-reference/functions/array-functions
- ClickHouse official documentation on ALTER TABLE: https://clickhouse.com/docs/en/sql-reference/statements/alter/column

## Issues Found
No technical issues found.

## Review Notes
- The Limitations section states that ALTER TABLE cannot add columns inside an existing Nested structure "without recreating or using specific ClickHouse versions." This is somewhat imprecise — ClickHouse has supported `ALTER TABLE ADD COLUMN nested_name.sub_col Type` for adding sub-columns to existing Nested structures for quite some time. The hedging language keeps it from being wrong, but a future revision could clarify the current ALTER TABLE capabilities.
- The post assumes `flatten_nested = 1` (the traditional default), where Nested sub-columns are stored as separate arrays. With `flatten_nested = 0`, Nested is stored as `Array(Tuple(...))` and access patterns differ. A brief mention of this setting could help readers on newer ClickHouse configurations, but its absence is not an error.
- Using `Float64` for monetary values (unit_price) is generally discouraged due to floating-point precision, but this is a domain concern outside the scope of the Nested data type tutorial.
