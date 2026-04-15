# Validation Summary: How to Use Nullable Columns Efficiently in ClickHouse

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- ClickHouse (MergeTree engine, Nullable data type, aggregate functions, materialized columns, ARRAY JOIN)
- SQL

## Sources Consulted
- ClickHouse Nullable data type documentation: https://clickhouse.com/docs/en/sql-reference/data-types/nullable
- ClickHouse functions for nulls: https://clickhouse.com/docs/en/sql-reference/functions/functions-for-nulls
- ClickHouse aggregate functions (sum): https://clickhouse.com/docs/en/sql-reference/aggregate-functions/reference/sum
- ClickHouse ALTER COLUMN documentation: https://clickhouse.com/docs/en/sql-reference/statements/alter/column
- ClickHouse ARRAY JOIN documentation: https://clickhouse.com/docs/en/sql-reference/statements/select/array-join

## Issues Found

1. **ORDER BY restriction understated**: The post said "Avoid them in ORDER BY keys" implying it was a best-practice recommendation. In reality, ClickHouse prohibits Nullable types in ORDER BY and PRIMARY KEY columns and will reject the table definition. Changed to state this is a hard constraint, not just advice.

2. **Redundant DISTINCT with GROUP BY**: The sensor query used `SELECT DISTINCT sensor_id ... GROUP BY sensor_id`. The DISTINCT is redundant when GROUP BY is applied to the same column. Removed DISTINCT.

3. **Incorrect sum() NULL comment**: A code comment stated "NULLs treated as 0 in sum" which contradicts the text above it that correctly says aggregate functions ignore NULLs. ClickHouse's `sum()` skips NULL values rather than treating them as 0. Changed comment to "NULLs excluded from sum" for consistency.

4. **Non-canonical materialized column backfill**: The post used `ALTER TABLE events UPDATE region_safe = ifNull(region, 'unknown') WHERE 1` to backfill a materialized column. ClickHouse provides the dedicated `ALTER TABLE ... MATERIALIZE COLUMN` statement for this purpose, which is the canonical approach. Replaced with `ALTER TABLE events MATERIALIZE COLUMN region_safe`.

5. **Unsafe assumeNotNull() usage with ARRAY JOIN**: The post recommended `assumeNotNull(nullable_tags)` for handling Nullable arrays with ARRAY JOIN. Per ClickHouse documentation, `assumeNotNull()` returns an undefined/arbitrary result when the value is actually NULL. Replaced with `ifNull(nullable_tags, [])` which safely converts NULL arrays to empty arrays.

## Review Notes
- The mermaid diagram uses conceptual file names (`data.bin`, `null_map.bin`) rather than ClickHouse's actual file naming convention, but this is acceptable for illustration purposes.
- The post does not mention that Nullable column data (including the null map) is compressed on disk like all ClickHouse column data, so the "one byte per row" overhead described is the uncompressed size. This is a minor omission but not an error.
- The post correctly notes that Nullable cannot be used in sort keys, but does not mention that Nullable also cannot wrap Array, Map, or Tuple types directly (though those types can contain Nullable elements, e.g., `Array(Nullable(Int8))`). This is a reasonable scope limitation.
