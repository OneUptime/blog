# Validation Summary: How to Use DELETE with ORDER BY in MySQL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL (DELETE statement with ORDER BY and LIMIT)
- Python (DB-API parameterized queries with MySQL)

## Sources Consulted
- MySQL 8.0 Reference Manual: DELETE Statement — https://dev.mysql.com/doc/refman/8.0/en/delete.html
- MySQL 8.0 Reference Manual: EXPLAIN Statement — https://dev.mysql.com/doc/refman/8.0/en/explain.html
- MySQL 8.0 Reference Manual: CREATE INDEX Statement — https://dev.mysql.com/doc/refman/8.0/en/create-index.html

## Issues Found
1. **Incorrect ORDER BY direction in "Keeping Only the Newest N Rows" section**: Both the SQL example and the Python code used `ORDER BY recorded_at DESC`, which would delete the **newest** rows first. The stated goal is to keep the newest 1,000 rows and delete the rest (oldest). Changed `ORDER BY recorded_at DESC` to `ORDER BY recorded_at ASC` in both the SQL snippet and the Python code so that the oldest rows are deleted first, preserving the newest ones as intended.

## Review Notes
- The post correctly notes that MySQL does not support subqueries or expressions in the LIMIT clause and provides a valid application-level workaround.
- The multi-table DELETE restriction and the derived-table subquery workaround (to avoid MySQL's "can't specify target table" error) are accurate.
- The composite index recommendation `(archived, created_at)` is correct for the query pattern shown.
- `EXPLAIN DELETE` is supported in MySQL 5.6.3+ and is correctly demonstrated.
