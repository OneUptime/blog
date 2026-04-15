# Validation Summary: How to Replace NULL Values in ClickHouse Query Results

## Status
validated

## Post Type
Tutorial / Reference Guide

## Technologies Covered
- ClickHouse (SQL dialect, NULL handling functions)
- SQL (ifNull, COALESCE, multiIf, aggregate functions, LEFT JOIN patterns)

## Sources Consulted
- ClickHouse official docs — Functions for Nullable Values: https://clickhouse.com/docs/sql-reference/functions/functions-for-nulls
- ClickHouse official docs — Conditional Functions (multiIf): https://clickhouse.com/docs/sql-reference/functions/conditional-functions
- ClickHouse official docs — Array Functions (arrayMap): https://clickhouse.com/docs/sql-reference/functions/array-functions
- ClickHouse official docs — numbers() table function: https://clickhouse.com/docs/sql-reference/table-functions/numbers
- ClickHouse official docs — Aggregate Functions (NULL behavior): https://clickhouse.com/docs/sql-reference/aggregate-functions
- ClickHouse official docs — String Functions (splitByChar): https://clickhouse.com/docs/sql-reference/functions/splitting-merging-functions

## Issues Found

1. **Description referenced non-existent `fillNull` function.** The description line mentioned "fillNull patterns" but ClickHouse has no `fillNull` function. Changed to "multiIf patterns" which is actually demonstrated in the post.

2. **Description listed `coalesce` and `COALESCE` as separate items.** These are the same function (ClickHouse registers `coalesce` as case-insensitive). Consolidated to just `COALESCE`.

3. **Intro paragraph listed `nullIf` as a function for replacing NULLs.** `nullIf(x, y)` does the opposite — it returns NULL when `x` equals `y`. It creates NULLs rather than replacing them, so listing it alongside `ifNull` and `COALESCE` as a NULL-replacement function was misleading. Also removed the redundant `coalesce`/`COALESCE` duplication. Changed the list to `ifNull`, `COALESCE`, and `multiIf`.

## Review Notes
- All SQL code examples use correct ClickHouse syntax and would work as described against appropriate table schemas.
- The `arrayMap(x -> ifNull(x, 0), scores)` example assumes an `Array(Nullable(T))` column, which is valid but uncommon in practice — most ClickHouse arrays don't contain Nullable elements by default.
- The `sumIf`/`countIf` mention in the aggregation section is slightly tangential — these are conditional aggregates rather than direct NULL-replacement tools — but not technically wrong since they can be used as alternative patterns for handling NULL-containing data.
