# Validation Summary: How to Use IFNULL() Function in MySQL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL (IFNULL(), COALESCE(), NULLIF(), IF() functions)
- SQL (SELECT, UPDATE, ORDER BY, LEFT JOIN, aggregate functions)

## Sources Consulted
- MySQL 8.0 Reference Manual — Flow Control Functions: https://dev.mysql.com/doc/refman/8.0/en/flow-control-functions.html#function_ifnull
- MySQL 8.0 Reference Manual — Comparison Functions: https://dev.mysql.com/doc/refman/8.0/en/comparison-operators.html#function_coalesce
- MySQL 8.0 Reference Manual — Comparison Functions (NULLIF): https://dev.mysql.com/doc/refman/8.0/en/flow-control-functions.html#function_nullif
- MySQL 8.0 Reference Manual — Working with NULL Values: https://dev.mysql.com/doc/refman/8.0/en/working-with-null.html

## Issues Found
- **ORDER BY example had incorrect comment and value**: The section claimed `IFNULL(salary, 0)` would "Sort NULL salaries last," but replacing NULLs with 0 in an ascending ORDER BY would place them at or near the beginning, not last. Changed the replacement value to `99999999` (a large sentinel) and updated the comment to accurately describe the behavior.

## Review Notes
- The aggregate function example `AVG(IFNULL(bonus, 0))` is technically correct but has different semantics than `AVG(bonus)`: the former includes NULL rows as 0 in the average (lowering it), while the latter excludes NULL rows entirely. The post doesn't claim equivalence, so this is not an error, but readers should be aware of the distinction.
- `IFNULL()` is MySQL-specific. The post correctly notes that `COALESCE()` is the multi-argument alternative but does not mention that `COALESCE()` is also the SQL-standard portable equivalent, which could be useful context for readers targeting multiple databases.
