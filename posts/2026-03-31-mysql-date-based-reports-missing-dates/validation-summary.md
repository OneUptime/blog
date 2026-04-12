# Validation Summary: How to Generate Date-Based Reports Even for Missing Dates in MySQL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL 8.0+ (recursive CTEs via `WITH RECURSIVE`)
- SQL date functions (`CURDATE`, `LAST_DAY`, `DAYOFWEEK`, `DAYNAME`, `DATE`)
- Calendar / date-dimension tables
- Generated (computed) columns (`GENERATED ALWAYS AS ... STORED`)
- `LEFT JOIN` gap-filling pattern
- `COALESCE` for NULL substitution

## Sources Consulted
- MySQL 8.0 Reference Manual — WITH (Common Table Expressions): https://dev.mysql.com/doc/refman/8.0/en/with.html
- MySQL 8.0 Reference Manual — `cte_max_recursion_depth` system variable: https://dev.mysql.com/doc/refman/8.0/en/server-system-variables.html#sysvar_cte_max_recursion_depth
- MySQL 8.0 Reference Manual — CREATE TABLE and Generated Columns: https://dev.mysql.com/doc/refman/8.0/en/create-table-generated-columns.html
- MySQL 8.0 Reference Manual — Date and Time Functions: https://dev.mysql.com/doc/refman/8.0/en/date-and-time-functions.html
- MySQL 8.0 Reference Manual — INSERT ... ON DUPLICATE KEY UPDATE: https://dev.mysql.com/doc/refman/8.0/en/insert-on-duplicate.html

## Issues Found
1. **Missing `cte_max_recursion_depth` setting for calendar table population.** The recursive CTE that populates the calendar table generates approximately 4,018 rows (2020-01-01 through 2030-12-31). MySQL's default `cte_max_recursion_depth` is 1,000, so the INSERT would fail with `ERROR 3636: Recursive query aborted after 1001 iterations`. Fixed by adding `SET SESSION cte_max_recursion_depth = 5000;` before the INSERT statement.

## Review Notes
- `COALESCE(COUNT(o.id), 0)` appears in several examples. `COUNT()` never returns NULL in MySQL (it returns 0 when no rows match), so the `COALESCE` wrapper is redundant. It is not incorrect — the query produces the same result — but readers may incorrectly infer that `COUNT()` can yield NULL. `COALESCE(SUM(...), 0)` is correct and necessary since `SUM()` does return NULL for an empty set.
- The final "Filling Zeros vs. NULL" snippet references `date_range` without an accompanying CTE definition. In context it is clearly a continuation of the earlier pattern, but readers copying just that block would get a syntax error. A comment noting the dependency on the earlier CTE would improve clarity.
- All SQL syntax requires MySQL 8.0+. Recursive CTEs are not available in MySQL 5.7 or earlier. The post does not explicitly state the minimum version requirement.
