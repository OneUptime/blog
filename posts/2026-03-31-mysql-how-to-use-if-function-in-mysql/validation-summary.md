# Validation Summary: How to Use IF() Function in MySQL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL (IF() function, IFNULL(), COALESCE(), CASE WHEN)
- SQL (SELECT, UPDATE, ORDER BY, aggregate functions)

## Sources Consulted
- MySQL 8.0 Reference Manual — Flow Control Functions: https://dev.mysql.com/doc/refman/8.0/en/flow-control-functions.html#function_if
- MySQL 8.0 Reference Manual — Working with NULL Values: https://dev.mysql.com/doc/refman/8.0/en/working-with-null.html
- MySQL 8.0 Reference Manual — IFNULL(): https://dev.mysql.com/doc/refman/8.0/en/flow-control-functions.html#function_ifnull

## Issues Found
No technical issues found.

## Review Notes
- The explanation that `NULL = NULL` returns NULL (not TRUE) is correct and an important nuance for readers to understand.
- The advice to prefer `CASE WHEN` over deeply nested `IF()` is good practice guidance.
- The conditional aggregation pattern `SUM(IF(..., 1, 0))` is a widely-used and valid technique, though readers should be aware that `COUNT(IF(..., 1, NULL))` is an equivalent alternative.
- All SQL syntax is valid across MySQL 5.x and 8.x versions.
