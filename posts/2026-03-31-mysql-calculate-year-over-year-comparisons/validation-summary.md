# Validation Summary: How to Calculate Year-over-Year Comparisons in MySQL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL 8.0+ (CTEs and window functions)
- LAG() window function
- Self-joins
- NULLIF() function
- YEAR() and MONTH() date functions
- ROUND() function
- PARTITION BY clause

## Sources Consulted
- MySQL 8.0 Reference Manual: Window Functions — https://dev.mysql.com/doc/refman/8.0/en/window-functions.html
- MySQL 8.0 Reference Manual: LAG() — https://dev.mysql.com/doc/refman/8.0/en/window-function-descriptions.html#function_lag
- MySQL 8.0 Reference Manual: WITH (Common Table Expressions) — https://dev.mysql.com/doc/refman/8.0/en/with.html
- MySQL 8.0 Reference Manual: NULLIF() — https://dev.mysql.com/doc/refman/8.0/en/flow-control-functions.html#function_nullif
- MySQL 8.0 Reference Manual: GROUP BY extensions (column alias usage) — https://dev.mysql.com/doc/refman/8.0/en/group-by-handling.html

## Issues Found
1. **Self-Join approach missing NULLIF for division-by-zero protection (line 25)**: The self-join example used `/ py.revenue` without wrapping it in `NULLIF(py.revenue, 0)`, unlike every other example in the post. While MySQL returns NULL for division by zero in SELECT context rather than erroring, this was inconsistent with the post's own summary advice ("Always use NULLIF to handle zero-value prior periods gracefully"). Fixed by changing `/ py.revenue` to `/ NULLIF(py.revenue, 0)`.

## Review Notes
- All examples require MySQL 8.0+ since they use CTEs (`WITH`) and window functions (`LAG()`), which were introduced in MySQL 8.0. The post does not mention this version requirement. For readers on MySQL 5.7 or earlier, only the self-join approach (without the CTE) would work.
- The monthly YoY approach using `LAG(revenue, 12)` assumes all 12 months have data in every year. If any months are missing (no orders), the 12th row back won't correspond to the same month in the prior year. The post accurately describes the mechanism ("looks back 12 rows in month-sorted order") but readers should be aware of this assumption.
- Using `year` as a column alias is valid in MySQL since `YEAR` is a non-reserved keyword, not a reserved word.
- Using column aliases (`yr`, `mo`) in `GROUP BY` is a MySQL-specific extension to standard SQL and works correctly in MySQL.
