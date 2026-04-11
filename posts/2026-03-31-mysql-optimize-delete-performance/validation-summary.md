# Validation Summary: How to Optimize DELETE Performance in MySQL

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- MySQL (InnoDB storage engine)
- SQL (DELETE, TRUNCATE, EXPLAIN, partitioning, DDL)
- Bash scripting (batch deletion loop)
- Python (batch deletion with mysql-connector or similar)

## Sources Consulted
- MySQL 8.0 Reference Manual: The data_lock_waits Table — https://dev.mysql.com/doc/refman/8.0/en/performance-schema-data-lock-waits-table.html
- MySQL 8.0 Reference Manual: InnoDB Transaction and Locking Information — https://dev.mysql.com/doc/refman/8.0/en/innodb-information-schema-transactions.html
- MySQL 5.7 Reference Manual: INNODB_LOCK_WAITS Table (deprecated) — https://dev.mysql.com/doc/refman/5.7/en/information-schema-innodb-lock-waits-table.html
- MySQL 8.0 Reference Manual: EXPLAIN Statement — https://dev.mysql.com/doc/refman/8.0/en/explain.html
- MySQL 8.0 Reference Manual: DELETE Statement — https://dev.mysql.com/doc/refman/8.0/en/delete.html
- MySQL 8.0 Reference Manual: TRUNCATE TABLE Statement — https://dev.mysql.com/doc/refman/8.0/en/truncate-table.html
- MySQL 8.0 Reference Manual: Partition Management — https://dev.mysql.com/doc/refman/8.0/en/partitioning-management.html

## Issues Found
1. **Lock monitoring query used removed `information_schema.innodb_lock_waits` table.** The tables `information_schema.innodb_lock_waits` and `information_schema.innodb_locks` were removed in MySQL 8.0.1. The query was updated to use `performance_schema.data_lock_waits` with the correct column names (`BLOCKING_ENGINE_TRANSACTION_ID`, `REQUESTING_ENGINE_TRANSACTION_ID`). A comment was added noting the query is for MySQL 8.0+.

## Review Notes
- The shell script batch deletion example uses `mysql -p` (password prompt) inside a while loop, which would prompt for a password on every iteration. In practice, a `.my.cnf` file or `--defaults-file` would be used, but this is a common convention in MySQL documentation examples and not a technical error.
- The TRUNCATE description ("drops and recreates the table structure") is accurate for MySQL/InnoDB behavior.
- The partitioning example correctly includes `created_at` in the PRIMARY KEY, which is required for partitioned InnoDB tables.
- The archive-then-delete pattern does not wrap the INSERT and DELETE in a transaction, which could lead to duplicates on failure. This is a design consideration rather than a code error, and the post's approach of batching the DELETE separately is reasonable for large datasets.
