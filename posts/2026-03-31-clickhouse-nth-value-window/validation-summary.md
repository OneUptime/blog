# Validation Summary: How to Use NTH_VALUE() Window Function in ClickHouse

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- ClickHouse
- SQL Window Functions (`NTH_VALUE`, `FIRST_VALUE`, `LAST_VALUE`, `ROW_NUMBER`)
- SQL (`COALESCE`, `ROUND`, `SELECT DISTINCT`, `PARTITION BY`)

## Sources Consulted
- ClickHouse official documentation — `nth_value` window function: https://clickhouse.com/docs/en/sql-reference/window-functions/nth_value
- ClickHouse official documentation — window functions overview: https://clickhouse.com/docs/en/sql-reference/window-functions
- ClickHouse official documentation — `first_value` window function (for NULL-handling behavior): https://clickhouse.com/docs/en/sql-reference/window-functions/first_value

## Issues Found
- **Minor description inaccuracy in the pivot-like section**: The text claimed the query "flattens a top-5 list into columns per region," but the actual query produces 3 store name columns and 2 revenue columns — not a top-5 ranking. Changed to "flattens the top-3 stores and their revenues into columns per region" to match the query.

## Review Notes
- ClickHouse's `nth_value` by default skips NULL arguments (IGNORE NULLS behavior), unlike standard SQL which defaults to RESPECT NULLS. The blog post does not discuss this distinction, but none of its claims conflict with this behavior — it only discusses the case where the partition has fewer than `n` rows, which correctly returns NULL regardless.
- All SQL examples use correct ClickHouse syntax and valid window frame specifications.
- The advice to use `ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING` for full-partition visibility is correct and well-explained.
- The default frame specification is described as `UNBOUNDED PRECEDING AND CURRENT ROW`, which is accurate. ClickHouse defaults to RANGE (not ROWS), but the blog does not claim the default type is ROWS — it only describes the boundaries, which are the same for both.
- The `ROW_NUMBER()` comparison example uses a subquery with `WHERE rn = 2` which is valid ClickHouse syntax.
- The `SELECT DISTINCT` pattern with window functions is correctly explained — window functions are evaluated before DISTINCT is applied.
