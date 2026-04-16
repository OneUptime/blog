# Validation Summary: How to Use Multiple Window Functions in a Single ClickHouse Query

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- ClickHouse
- SQL window functions (ROW_NUMBER, RANK, NTILE, LAG, sum/avg/max over windows)
- MergeTree table engine
- Named WINDOW clause
- Window frame specifications (ROWS BETWEEN ... PRECEDING AND CURRENT ROW)

## Sources Consulted
- ClickHouse Window Functions reference: https://clickhouse.com/docs/en/sql-reference/window-functions
- ClickHouse `lag` function: https://clickhouse.com/docs/sql-reference/window-functions/lag
- ClickHouse `lagInFrame`: https://clickhouse.com/docs/en/sql-reference/window-functions/lagInFrame
- ClickHouse MergeTree engine reference

## Issues Found
No technical issues found. All code examples use valid ClickHouse syntax:
- `LAG(value, offset)` and `LAG(value, offset, default)` are supported as first-class functions per current ClickHouse docs (equivalent to `lagInFrame` with unbounded frame).
- The `WINDOW` clause with named windows (`WINDOW w AS (...)`) is supported.
- `ROW_NUMBER()`, `RANK()`, `NTILE(n)` are all supported ranking functions.
- Frame specifications `ROWS BETWEEN N PRECEDING AND CURRENT ROW` and `ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW` are valid.
- When `PARTITION BY` is used without `ORDER BY`, the default frame is `RANGE BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING`, which correctly covers the entire partition — making `w_cat_total AS (PARTITION BY category, sale_date)` produce the partition total as intended.
- Multi-expression `PARTITION BY` (e.g., `PARTITION BY product_id, toYear(sale_date)`) is valid.
- Table DDL uses valid types (Date, UInt32, LowCardinality(String), Float64) and correct MergeTree syntax.

## Review Notes
- ClickHouse historically required `lagInFrame`/`leadInFrame` (which respect the window frame), and standard `LAG`/`LEAD` previously required the new analyzer. Current ClickHouse docs list `lag`/`lead` as first-class functions, so the post's usage is correct for modern ClickHouse versions. Users on older ClickHouse releases without the new analyzer may need to substitute `lagInFrame`, but this is a version caveat rather than an error.
- The "Performance: Window Sorting Cost" section's advice is accurate — sharing window definitions via the `WINDOW` clause allows ClickHouse to reuse sorts across functions.
