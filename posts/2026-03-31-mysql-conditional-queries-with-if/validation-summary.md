# Validation Summary: How to Write Conditional Queries with IF() in MySQL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL (IF() function, CASE WHEN, IFNULL(), COALESCE())
- SQL (SELECT, WHERE, UPDATE, GROUP BY, aggregate functions)

## Sources Consulted
- MySQL 8.0 Reference Manual — Flow Control Functions: https://dev.mysql.com/doc/refman/8.0/en/flow-control-functions.html#function_if
- MySQL 8.0 Reference Manual — User-Defined Variables: https://dev.mysql.com/doc/refman/8.0/en/user-variables.html
- MySQL 8.0 Reference Manual — Date and Time Functions (NOW(), INTERVAL): https://dev.mysql.com/doc/refman/8.0/en/date-and-time-functions.html
- MySQL 8.0 Reference Manual — Aggregate Functions (SUM, COUNT): https://dev.mysql.com/doc/refman/8.0/en/aggregate-functions.html

## Issues Found
No technical issues found.

## Review Notes
- All SQL examples are syntactically correct and use current, non-deprecated MySQL functions.
- The post correctly distinguishes between the `IF()` expression function and the `IF` control flow statement used in stored programs, by focusing exclusively on the expression form.
- The recommendation to use `CASE WHEN` for more than two branches is sound advice and aligns with MySQL community best practices.
- The conditional aggregation pattern `SUM(IF(..., 1, 0))` is a well-established MySQL idiom. An alternative approach using `COUNT(IF(..., 1, NULL))` also works but the SUM pattern shown is equally valid and perhaps more intuitive.
