# Validation Summary: How to Use the MAX() Function in MySQL

## Status
validated

## Post Type
Tutorial / Reference

## Technologies Covered
- MySQL (aggregate functions, window functions)
- SQL (standard SELECT, WHERE, GROUP BY, HAVING, OVER clauses)

## Sources Consulted
- MySQL 8.0 Reference Manual — Aggregate Functions: https://dev.mysql.com/doc/refman/8.0/en/aggregate-functions.html#function_max
- MySQL 8.0 Reference Manual — Window Functions: https://dev.mysql.com/doc/refman/8.0/en/window-functions-usage.html
- MySQL 8.0 Reference Manual — SELECT Statement (HAVING clause alias behavior): https://dev.mysql.com/doc/refman/8.0/en/select.html

## Issues Found
1. **Misleading section title "MAX vs LAST_VALUE Window Function"**: The section content demonstrates `MAX()` used as a window function with `OVER (PARTITION BY ...)`, but does not mention or compare with `LAST_VALUE` at all. Renamed the section to "MAX as a Window Function" to accurately reflect the content.

## Review Notes
- The `HAVING max_price > 500` example uses a column alias in the HAVING clause. This is a MySQL-specific extension (not standard SQL) but is valid and well-documented MySQL behavior. Since the post is explicitly about MySQL, this is correct.
- Window function examples (`MAX() OVER (...)`) require MySQL 8.0+, which is correctly noted in the summary section.
- The `YEAR(completed_at) = 2025` filter in the WHERE example is functionally correct but prevents index usage on the `completed_at` column. A range condition like `completed_at >= '2025-01-01' AND completed_at < '2026-01-01'` would be more performant. This is a performance consideration, not a correctness issue, so no change was made.
