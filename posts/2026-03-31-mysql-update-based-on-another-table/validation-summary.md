# Validation Summary: How to Update Rows Based on Another Table in MySQL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL (multi-table UPDATE syntax)
- SQL JOIN operations
- Correlated subqueries
- DML (Data Manipulation Language)

## Sources Consulted
- MySQL 8.0 Reference Manual: UPDATE Statement — https://dev.mysql.com/doc/refman/8.0/en/update.html
- MySQL 8.0 Reference Manual: JOIN Clause — https://dev.mysql.com/doc/refman/8.0/en/join.html
- MySQL 8.0 Reference Manual: Subqueries — https://dev.mysql.com/doc/refman/8.0/en/subqueries.html
- MySQL 8.0 Reference Manual: ROW_COUNT() — https://dev.mysql.com/doc/refman/8.0/en/information-functions.html#function_row-count

## Issues Found
No technical issues found.

## Review Notes
- The correlated subquery example (`UPDATE employees e SET e.department_name = (SELECT d.name ...)`) will set `department_name` to NULL for any employee whose `department_id` does not match a row in the `departments` table. This is correct behavior but could surprise readers. A brief mention or a `WHERE EXISTS` guard would be a useful future enhancement.
- All SQL syntax is valid for both MySQL 5.7 and MySQL 8.0+.
- The advice to preview with a matching `SELECT` before executing an `UPDATE` is sound and a widely recommended best practice.
