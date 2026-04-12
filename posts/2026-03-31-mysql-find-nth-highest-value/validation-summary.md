# Validation Summary: How to Find the Nth Highest Value in MySQL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL (5.7 and 8.0+)
- SQL (LIMIT/OFFSET, subqueries, window functions)
- DENSE_RANK() and RANK() window functions
- MySQL stored functions

## Sources Consulted
- MySQL 8.0 Reference Manual: Window Functions — https://dev.mysql.com/doc/refman/8.0/en/window-functions.html
- MySQL 8.0 Reference Manual: DENSE_RANK() — https://dev.mysql.com/doc/refman/8.0/en/window-function-descriptions.html#function_dense-rank
- MySQL 8.0 Reference Manual: Subqueries with IN — https://dev.mysql.com/doc/refman/8.0/en/subqueries.html
- MySQL 8.0.19 Release Notes (LIMIT in subqueries with IN/ALL/ANY/SOME) — https://dev.mysql.com/doc/relnotes/mysql/8.0/en/news-8-0-19.html
- MySQL 8.0 Reference Manual: CREATE FUNCTION Statement — https://dev.mysql.com/doc/refman/8.0/en/create-procedure.html

## Issues Found
1. **Outdated claim about LIMIT in subqueries**: The post stated "MySQL does not allow `LIMIT` in subqueries used with `IN`" as a blanket rule. This was true for MySQL versions before 8.0.19, but starting from MySQL 8.0.19, this restriction was lifted. Fixed by qualifying the statement with the version ("MySQL versions before 8.0.19 do not allow...") and noting the derived table approach is for broad compatibility.

2. **Wrong code block language for EXPLAIN**: The EXPLAIN SQL statement was wrapped in a ` ```bash ` code block. EXPLAIN is a SQL statement, not a bash command. Changed to ` ```sql `.

## Review Notes
- All SQL syntax (SELECT, LIMIT/OFFSET, DENSE_RANK, RANK, PARTITION BY, stored function) is correct and verified against MySQL 8.0 documentation.
- The explanation of DENSE_RANK() vs RANK() behavior with ties is accurate.
- The stored function correctly uses READS SQL DATA characteristic and LIMIT 1 to handle potential multiple rows with the same rank.
- The nested MAX subquery approach is logically correct for finding the Nth highest value.
- The post could mention that NOT IN behaves unexpectedly when the subquery result contains NULL values, but this is an edge case and not an error in the post as written.
