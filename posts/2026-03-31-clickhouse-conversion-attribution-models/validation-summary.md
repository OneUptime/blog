# Validation Summary: How to Build Conversion Attribution Models in ClickHouse

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- ClickHouse SQL (MergeTree engine, CTEs, aggregate functions)
- `argMin` / `argMax` aggregate functions
- `groupArray`, `arraySort`, `arrayMap` array functions
- `LowCardinality(String)`, `Decimal(10, 2)`, `UUID` data types
- `generateUUIDv4()` and `toYYYYMM()` functions

## Sources Consulted
- ClickHouse official documentation: https://clickhouse.com/docs/en/sql-reference/aggregate-functions/reference/argmin
- ClickHouse official documentation: https://clickhouse.com/docs/en/sql-reference/aggregate-functions/reference/argmax
- ClickHouse official documentation: https://clickhouse.com/docs/en/sql-reference/aggregate-functions/reference/grouparray
- ClickHouse official documentation: https://clickhouse.com/docs/en/sql-reference/data-types/lowcardinality
- ClickHouse official documentation: https://clickhouse.com/docs/en/sql-reference/data-types/decimal
- ClickHouse official documentation: https://clickhouse.com/docs/en/sql-reference/statements/select/with (CTE syntax)
- ClickHouse official documentation: https://clickhouse.com/docs/en/sql-reference/functions/array-functions (arraySort, arrayMap)

## Issues Found
1. **Path Analysis query had two bugs**:
   - The outer `GROUP BY user_id` with `count() AS users` counted touchpoints per user rather than counting users per distinct path. For "most common conversion paths" this produces one row per user instead of aggregating duplicate paths.
   - `groupArray` ordering from a subquery `ORDER BY` is not guaranteed by ClickHouse (docs explicitly state "indeterminate order" and only preserved "in some cases if the subquery result is small enough").
   
   **Fix applied**: Rewrote the query to use `arraySort(groupArray((touch_time, channel)))` with `arrayMap(x -> x.2, ...)` for guaranteed time-ordered paths inside an inner aggregation, then added an outer `GROUP BY path` so `count()` properly counts how many users produced each path and `sum(revenue)` aggregates revenue across users for that path.

## Review Notes
- The table DDL, first-touch, last-touch, linear attribution, and comparison queries are all syntactically valid and logically sound.
- The linear attribution query correctly distributes `total_value / num_touches` across each touchpoint, weighting channels by their touchpoint frequency (e.g. 3 email + 2 paid_search = 60%/40% split). This matches standard linear attribution semantics.
- The intro mentions "window functions and array aggregations" but the post uses aggregate functions (`argMin`, `argMax`, `sum`) and array functions rather than window functions (`OVER()`). This is a minor wording looseness, not a technical error, so it was left alone per the "only fix technical errors" guideline.
- `toYYYYMM()` is a valid ClickHouse date function for partitioning; the Explore agent could not locate it in a specific docs page but it is widely documented and used.
- The last-touch query defines "last touch" as the max `touch_time` over all touchpoints for a user (including any that may correspond to the conversion itself). This is a reasonable modeling choice but readers with a strict "last touch before conversion" definition would need to filter `WHERE touch_time < conversion_time`.
