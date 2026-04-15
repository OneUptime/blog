# Validation Summary: How to Use mapFromArrays() in ClickHouse

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- ClickHouse (SQL dialect, MergeTree engine)
- ClickHouse Map functions (`mapFromArrays`, `mapKeys`, `mapValues`, `map`)
- ClickHouse Array functions (`groupArray`, `arrayMap`)
- ClickHouse aggregate functions (`sum`, `round`)

## Sources Consulted
- ClickHouse official documentation — Map functions: https://clickhouse.com/docs/en/sql-reference/functions/tuple-map-functions#mapfromarrays
- ClickHouse official documentation — Array functions: https://clickhouse.com/docs/en/sql-reference/functions/array-functions
- ClickHouse official documentation — Aggregate functions: https://clickhouse.com/docs/en/sql-reference/aggregate-functions/reference/grouparray

## Issues Found
1. **Nested aggregate functions in "Creating a Lookup Table" query**: The original query used `groupArray(round(sum(revenue), 2))`, which nests the `sum()` aggregate inside the `groupArray()` aggregate. ClickHouse does not allow nested aggregate functions and this query would fail with an error. Fixed by splitting the aggregation into two CTE steps: first a `sku_totals` CTE that computes `sum(revenue)` per SKU with a `GROUP BY`, then a `sku_revenue_map` CTE that uses `groupArray()` on the pre-aggregated results to build the map.

## Review Notes
- All other SQL examples are syntactically correct and use valid ClickHouse functions and syntax.
- The `mapFromArrays` function signature, behavior description, and inverse relationship with `mapKeys`/`mapValues` are all accurate.
- The `CREATE TABLE` statements use correct MergeTree engine syntax with appropriate ORDER BY clauses.
- The `arrayMap` lambda syntax (`s -> concat('sku_', s)`) is correct for ClickHouse.
- Map element access via bracket notation (`rev_map[d.product_sku]`) is correct.
