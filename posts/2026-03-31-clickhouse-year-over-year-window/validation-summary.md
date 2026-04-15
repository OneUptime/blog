# Validation Summary: How to Compute Year-Over-Year Growth with Window Functions in ClickHouse

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- ClickHouse (MergeTree engine, Date/String/Float64 types)
- SQL window functions (LAG with offset)
- SQL CASE expressions
- Year-over-year growth calculation patterns

## Sources Consulted
- ClickHouse documentation on window functions: https://clickhouse.com/docs/en/sql-reference/window-functions
- ClickHouse documentation on `lag()`: https://clickhouse.com/docs/en/sql-reference/window-functions#lag
- ClickHouse documentation on `round()`: https://clickhouse.com/docs/en/sql-reference/functions/rounding-functions#round
- ClickHouse documentation on MergeTree engine: https://clickhouse.com/docs/en/engines/table-engines/mergetree-family/mergetree
- ClickHouse documentation on data types: https://clickhouse.com/docs/en/sql-reference/data-types

## Issues Found
No technical issues found.

## Review Notes
- The `lag()` approach with offset 12 assumes no gaps in the monthly data (exactly one row per month per region). If months are missing, the offset would not correctly align to the same calendar month in the prior year. The post's controlled sample data avoids this, but production use should ensure data completeness or consider a self-join on calendar dates instead.
- The daily LAG(365) section correctly warns about leap years, which is a common pitfall. The suggested alternative of joining on `date - interval 1 year` is good advice.
- Division by zero is not handled in the growth percentage formula. If `prior_year_revenue` were 0, the query would return `inf` or `nan`. This is not an issue with the sample data (all positive values) but could matter in production scenarios.
- The post uses `lag()` (not `lagInFrame()`), which is correct since `lag()` operates over the entire partition regardless of frame specification, while `lagInFrame()` is restricted to the window frame.
