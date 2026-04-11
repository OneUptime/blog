# Validation Summary: How to Merge Duplicate Records in MySQL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL (SQL syntax, transactions, stored procedures, cursors)

## Sources Consulted
- MySQL 8.0 Reference Manual: SELECT Statement — HAVING clause and column alias usage (https://dev.mysql.com/doc/refman/8.0/en/select.html)
- MySQL 8.0 Reference Manual: UPDATE Statement — multi-table UPDATE syntax (https://dev.mysql.com/doc/refman/8.0/en/update.html)
- MySQL 8.0 Reference Manual: CREATE PROCEDURE — cursor declarations and DECLARE ordering (https://dev.mysql.com/doc/refman/8.0/en/create-procedure.html)
- MySQL 8.0 Reference Manual: Cursors (https://dev.mysql.com/doc/refman/8.0/en/cursors.html)
- MySQL 8.0 Reference Manual: START TRANSACTION, COMMIT, and ROLLBACK (https://dev.mysql.com/doc/refman/8.0/en/commit.html)
- MySQL 8.0 Reference Manual: Subqueries in the FROM clause (derived tables) for the "can't specify target table" workaround (https://dev.mysql.com/doc/refman/8.0/en/derived-tables.html)

## Issues Found

1. **Misleading comment in "Merging Data from Duplicate Rows" section**: The comment said "Keep the earliest created_at and most recent updated_at" but the code never updates `updated_at` — it updates `created_at`, `phone`, and `address`. Fixed the comment to "Keep the earliest created_at and fill in missing phone/address" to accurately describe what the code does.

2. **Stored procedure only handled exact pairs**: The cursor query used `HAVING COUNT(*) = 2` and `SELECT MIN(id), MAX(id)`, which meant groups with 3 or more duplicates were silently skipped. This contradicted the section description "Automate the process for all duplicate groups." Fixed by rewriting the cursor to join the canonical-id subquery back against the customers table, returning one row per duplicate across all groups regardless of group size. Also prefixed the local variables with `v_` to avoid potential name collisions with column names.

## Review Notes
- The `HAVING cnt > 1` usage in the first query (using a column alias in HAVING) is a MySQL-specific extension to standard SQL. It works correctly in MySQL but would fail in other databases like PostgreSQL. This is acceptable given the post targets MySQL specifically.
- The multi-table UPDATE in the "Merging Data" section processes non-deterministically when there are 3+ duplicates joined to the canonical row, but the COALESCE/LEAST logic produces correct results regardless of processing order (LEAST always picks the minimum, and COALESCE fills the first non-null value then preserves it).
- The transaction example uses a derived table `(SELECT phone FROM customers WHERE id = 1099) t` as a workaround for MySQL's restriction on reading and writing the same table in an UPDATE subquery. This is a valid and well-known pattern.
