# Validation Summary: How to Update Rows with UPDATE in MySQL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL (UPDATE DML statement)
- SQL (general syntax)
- MySQL Workbench (sql_safe_updates mode)

## Sources Consulted
- MySQL 8.0 Reference Manual: UPDATE Statement — https://dev.mysql.com/doc/refman/8.0/en/update.html
- MySQL 8.0 Reference Manual: Information Functions (ROW_COUNT()) — https://dev.mysql.com/doc/refman/8.0/en/information-functions.html#function_row-count
- MySQL 8.0 Reference Manual: Server System Variables (sql_safe_updates) — https://dev.mysql.com/doc/refman/8.0/en/server-system-variables.html#sysvar_sql_safe_updates
- MySQL 8.0 Reference Manual: Subqueries — https://dev.mysql.com/doc/refman/8.0/en/subqueries.html

## Issues Found
No technical issues found.

## Review Notes
- The description of `sql_safe_updates` is slightly simplified. The MySQL docs state it blocks UPDATE/DELETE statements that do not use a key in the WHERE clause (any indexed column, not just a primary key) **and** do not have a LIMIT clause. The blog says "primary key lookup" which is the most common case but not the only one. This simplification is acceptable for an introductory tutorial.
- The `ROW_COUNT()` behavior described (returning changed rows, not matched rows) is the default. This can be altered with the `CLIENT_FOUND_ROWS` connection flag, which is not mentioned. For a beginner tutorial this omission is reasonable.
- All SQL examples are syntactically correct and would execute as described on MySQL 5.7+/8.0+.
