# Validation Summary: How to Use MySQL CASE WHEN Expression

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL (CASE WHEN expression)
- SQL (conditional expressions, aggregates, DML statements)

## Sources Consulted
- MySQL 8.0 Reference Manual: CASE Expression — https://dev.mysql.com/doc/refman/8.0/en/case.html
- MySQL 8.0 Reference Manual: Flow Control Functions — https://dev.mysql.com/doc/refman/8.0/en/flow-control-functions.html
- MySQL 8.0 Reference Manual: UPDATE Statement — https://dev.mysql.com/doc/refman/8.0/en/update.html
- MySQL 8.0 Reference Manual: SELECT Statement — https://dev.mysql.com/doc/refman/8.0/en/select.html

## Issues Found
No technical issues found.

## Review Notes
- The WHERE clause example uses CASE with boolean THEN expressions (e.g., `total > 100`). This works in MySQL because boolean expressions evaluate to 0 or 1, and WHERE treats non-zero as true. While valid, readers unfamiliar with MySQL's boolean-as-integer behavior may find this pattern surprising. A brief note could help, but it is not a correctness issue.
- All sample output tables were verified against the provided INSERT data and are accurate.
- The SUM vs COUNT guidance in Best Practices is correct and a useful distinction for readers.
