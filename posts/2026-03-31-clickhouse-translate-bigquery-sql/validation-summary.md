# Validation Summary: How to Translate BigQuery SQL to ClickHouse SQL

## Status
validated

## Post Type
Guide

## Technologies Covered
- ClickHouse (SQL dialect, data types, aggregate functions, array functions)
- Google BigQuery (SQL dialect, data types, aggregate functions)
- SQL migration/translation patterns

## Sources Consulted
- ClickHouse documentation: data types (Int64, Float64, Decimal, String, UInt8, DateTime64, Date, Array, Tuple) — https://clickhouse.com/docs/en/sql-reference/data-types
- ClickHouse documentation: dateDiff function — https://clickhouse.com/docs/en/sql-reference/functions/date-time-functions#datediff
- ClickHouse documentation: toStartOfMonth function — https://clickhouse.com/docs/en/sql-reference/functions/date-time-functions#tostartofmonth
- ClickHouse documentation: groupArray aggregate function — https://clickhouse.com/docs/en/sql-reference/aggregate-functions/reference/grouparray
- ClickHouse documentation: arraySort, arrayMap, arrayJoin functions — https://clickhouse.com/docs/en/sql-reference/functions/array-functions
- ClickHouse documentation: uniq and uniqHLL12 functions — https://clickhouse.com/docs/en/sql-reference/aggregate-functions/reference/uniq
- BigQuery documentation: ARRAY_AGG function — https://cloud.google.com/bigquery/docs/reference/standard-sql/aggregate_functions#array_agg
- BigQuery documentation: TIMESTAMP_DIFF function — https://cloud.google.com/bigquery/docs/reference/standard-sql/timestamp_functions#timestamp_diff
- BigQuery documentation: APPROX_COUNT_DISTINCT function — https://cloud.google.com/bigquery/docs/reference/standard-sql/approximate_aggregate_functions#approx_count_distinct

## Issues Found
- **Incorrect arraySort translation for ordered ARRAY_AGG**: The original ClickHouse example `arraySort(groupArray(product_id))` was presented as equivalent to BigQuery's `ARRAY_AGG(product_id ORDER BY created_at)`. However, `arraySort(groupArray(product_id))` sorts by `product_id` values, not by `created_at`. Fixed by replacing with the correct tuple-based approach: `arrayMap(x -> x.2, arraySort(x -> x.1, groupArray(tuple(created_at, product_id))))`, which collects (created_at, product_id) tuples, sorts by the created_at element, then extracts the product_id values — faithfully replicating the BigQuery ORDER BY behavior.

## Review Notes
- ClickHouse has a native `Bool` type (since v21.12) which is an alias for `UInt8`. The post's mapping of BigQuery `BOOL` to `UInt8` is correct and widely used, but authors could optionally mention `Bool` as an alternative in future updates.
- The `dateDiff` parameter order (unit, start, end) is correct and produces the same result as BigQuery's `TIMESTAMP_DIFF(end, start, unit)` — both return end minus start.
- The `uniqHLL12` recommendation for HyperLogLog++ equivalence is appropriate since BigQuery's `APPROX_COUNT_DISTINCT` uses HyperLogLog++ internally.
- All other code examples, data type mappings, and function translations are accurate.
