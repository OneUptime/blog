# Validation Summary: How to Translate Redshift SQL to ClickHouse SQL

## Status
validated

## Post Type
Guide

## Technologies Covered
- Amazon Redshift (SQL dialect, data types, distribution/sort keys)
- ClickHouse (SQL dialect, MergeTree engine, data types, aggregate and array functions)
- SQL migration/translation patterns

## Sources Consulted
- ClickHouse documentation: Date/Time functions (toStartOfWeek, addHours, dateDiff) — https://clickhouse.com/docs/en/sql-reference/functions/date-time-functions
- ClickHouse documentation: Functions for Nulls (ifNull) — https://clickhouse.com/docs/en/sql-reference/functions/functions-for-nulls
- ClickHouse documentation: Array functions (arraySort, arrayStringConcat) — https://clickhouse.com/docs/en/sql-reference/functions/array-functions
- ClickHouse documentation: Aggregate functions (groupArray, uniq) — https://clickhouse.com/docs/en/sql-reference/aggregate-functions
- ClickHouse documentation: Data types (DateTime, Bool, Decimal) — https://clickhouse.com/docs/en/sql-reference/data-types
- Amazon Redshift SQL reference: DATE_TRUNC, DATEADD, DATEDIFF, LISTAGG, NVL, APPROXIMATE COUNT

## Issues Found
- **`toStartOfWeek` default mode mismatch**: The original post used `toStartOfWeek(event_time)` which defaults to mode 0 (Sunday as week start). Redshift's `DATE_TRUNC('week', timestamp)` follows ISO 8601, treating Monday as the first day of the week. Fixed to `toStartOfWeek(event_time, 1)` to produce equivalent Monday-based results.

## Review Notes
- The `BOOLEAN -> UInt8` mapping is technically correct since ClickHouse's `Bool` type is an alias for `UInt8`. However, ClickHouse now has a native `Bool` type that displays as `true`/`false`, which would be a more direct mapping for Redshift's `BOOLEAN`.
- The `TIMESTAMP -> DateTime` mapping is correct for second-precision timestamps. If sub-second precision is needed (Redshift supports microseconds), `DateTime64(6)` would be more appropriate.
- The `uniq()` function is correctly identified as ClickHouse's approximate count distinct. For exact counts, `uniqExact()` or `COUNT(DISTINCT ...)` would be the equivalent of Redshift's non-approximate `COUNT(DISTINCT ...)`.
- All other function signatures, parameter orders, and type mappings were verified as correct.
