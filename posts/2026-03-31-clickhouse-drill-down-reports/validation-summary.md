# Validation Summary: How to Build Drill-Down Reports in ClickHouse

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- ClickHouse (SQL, MergeTree engine)
- `WITH ROLLUP` / `WITH CUBE` GROUP BY modifiers
- `GROUPING()` aggregate function
- ClickHouse parameterized queries (`{name:Type}` syntax)

## Sources Consulted
- ClickHouse GROUP BY docs (ROLLUP / CUBE modifiers): https://clickhouse.com/docs/en/sql-reference/statements/select/group-by
- ClickHouse `GROUPING` aggregate function: https://clickhouse.com/docs/en/sql-reference/aggregate-functions/grouping_function
- ClickHouse ORDER BY (NULLS FIRST/LAST): https://clickhouse.com/docs/en/sql-reference/statements/select/order-by
- ClickHouse parameterized query syntax: https://clickhouse.com/docs/en/interfaces/cli and HTTP interface docs
- ClickHouse MergeTree engine: https://clickhouse.com/docs/en/engines/table-engines/mergetree-family/mergetree

## Issues Found
1. **Incorrect claim that ROLLUP subtotals are NULL.** The post stated "rows where `category` is NULL represent region subtotals; rows where `region` is NULL are grand totals." ClickHouse's docs are explicit: "In the subtotals rows the values of already 'grouped' key expressions are set to `0` or empty line." Subtotals only appear as actual `NULL` if the grouping columns are declared `Nullable(...)`. Fixed the explanation to describe default-value filling (empty string for `String`, `0` for numeric) and noted that `Nullable(...)` is required to get true `NULL` markers.

2. **`NULLS FIRST` in ORDER BY has no effect on ROLLUP subtotals by default.** Since ClickHouse fills subtotal rows with default values (not NULL) unless the columns are `Nullable`, the `ORDER BY region NULLS FIRST, category NULLS FIRST, product NULLS FIRST` clause would not reliably place subtotals first. Replaced with a plain `ORDER BY region, category, product` so the example matches the corrected explanation of subtotal filling.

3. **`groupingId()` is not a ClickHouse function.** The example used `groupingId(region)`, which is an Oracle/Snowflake name. ClickHouse provides `GROUPING(col1, col2, ...)` which returns a bitmask (`1` for rolled-up columns, `0` for detail values). Renamed the function to `GROUPING()` throughout the section and the Summary. The conditional direction (`= 0` returns the column value, else `'ALL'`) is already correct under `GROUPING` semantics, so only the name was changed.

## Review Notes
- The `{region:String}` parameterized query syntax and the MergeTree `CREATE TABLE` example are correct as written.
- The sample `INSERT` values and ordering key `(order_date, region, category)` are valid.
- The parameterized WHERE pattern `({region:String} = '' OR region = {region:String})` works, though readers should be aware it assumes the caller passes an empty string for "no filter" rather than an unset parameter — a minor UX caveat, not a correctness issue.
- The post does not discuss `WITH CUBE` despite mentioning it in the intro and description; that is a content/stylistic gap rather than a technical error, so it was left alone per the review guidelines.
