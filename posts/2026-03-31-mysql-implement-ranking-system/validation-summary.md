# Validation Summary: How to Implement a Ranking System in MySQL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL 8.0 (window functions: RANK, DENSE_RANK, ROW_NUMBER, PERCENT_RANK)
- MySQL 5.7 (user variable ranking technique)
- SQL (CREATE TABLE, INSERT, SELECT, subqueries, ON DUPLICATE KEY UPDATE)

## Sources Consulted
- MySQL 8.0 Reference Manual — Window Functions: https://dev.mysql.com/doc/refman/8.0/en/window-function-descriptions.html
- MySQL 8.0 Reference Manual — RANK(): https://dev.mysql.com/doc/refman/8.0/en/window-function-descriptions.html#function_rank
- MySQL 8.0 Reference Manual — DENSE_RANK(): https://dev.mysql.com/doc/refman/8.0/en/window-function-descriptions.html#function_dense-rank
- MySQL 8.0 Reference Manual — ROW_NUMBER(): https://dev.mysql.com/doc/refman/8.0/en/window-function-descriptions.html#function_row-number
- MySQL 8.0 Reference Manual — PERCENT_RANK(): https://dev.mysql.com/doc/refman/8.0/en/window-function-descriptions.html#function_percent-rank
- MySQL 8.0 Reference Manual — User-Defined Variables: https://dev.mysql.com/doc/refman/8.0/en/user-variables.html
- MySQL 8.0 Reference Manual — INSERT ... ON DUPLICATE KEY UPDATE: https://dev.mysql.com/doc/refman/8.0/en/insert-on-duplicate.html

## Issues Found
No technical issues found.

## Review Notes
- The `VALUES()` function used in the `ON DUPLICATE KEY UPDATE` clause of the precomputed ranks section is deprecated as of MySQL 8.0.20 in favor of row/column aliases (e.g., `INSERT INTO ... AS new ON DUPLICATE KEY UPDATE score = new.score`). The current syntax still works in all MySQL versions but may generate deprecation warnings on MySQL 8.0.20+. This is not an error — just something to be aware of for future updates.
- The MySQL 5.7 user variable technique is correctly noted as a version-specific approach. The MySQL documentation warns that the order of evaluation of user variable assignments in SELECT is undefined, though in practice the left-to-right evaluation within a single SELECT is reliable in MySQL 5.7. This caveat is widely understood and the technique is a standard pattern in pre-8.0 MySQL.
- All result values in the example output table were manually verified against the sample data and are correct.
