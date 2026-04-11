# Validation Summary: How to Optimize Queries on Large Tables in MySQL

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- MySQL (InnoDB storage engine)
- SQL (DDL and DML)
- MySQL EXPLAIN output
- MySQL partitioning (RANGE COLUMNS)
- MySQL information_schema and system tables

## Sources Consulted
- MySQL 8.0 Reference Manual: information_schema.TABLES table — https://dev.mysql.com/doc/refman/8.0/en/information-schema-tables-table.html
- MySQL 8.0 Reference Manual: EXPLAIN output format — https://dev.mysql.com/doc/refman/8.0/en/explain-output.html
- MySQL 8.0 Reference Manual: CREATE INDEX statement — https://dev.mysql.com/doc/refman/8.0/en/create-index.html
- MySQL 8.0 Reference Manual: Partitioning by RANGE COLUMNS — https://dev.mysql.com/doc/refman/8.0/en/partitioning-columns-range.html
- MySQL 8.0 Reference Manual: ANALYZE TABLE statement — https://dev.mysql.com/doc/refman/8.0/en/analyze-table.html
- MySQL 8.0 Reference Manual: innodb_table_stats table — https://dev.mysql.com/doc/refman/8.0/en/innodb-persistent-stats.html
- MySQL 8.0 Reference Manual: LIMIT optimization — https://dev.mysql.com/doc/refman/8.0/en/limit-optimization.html

## Issues Found
1. **Incorrect column name in statistics query**: The query `SELECT last_analyzed FROM information_schema.tables` referenced a column (`last_analyzed`) that does not exist in MySQL's `information_schema.tables`. This column name comes from Oracle's `DBA_TABLES` or PostgreSQL's `pg_stat_user_tables`. Fixed by changing the query to use `SELECT last_update FROM mysql.innodb_table_stats`, which is the correct MySQL table and column for checking when InnoDB statistics were last updated via `ANALYZE TABLE`. Also updated the comment from "Check when statistics were last updated" to "Check when InnoDB statistics were last updated" for accuracy.

## Review Notes
- The covering index column order `(status, created_at, customer_id, total)` is correctly designed: equality predicate column (`status`) first, then range predicate column (`created_at`), then remaining SELECT columns (`customer_id`, `total`). This is optimal.
- The partitioned table correctly includes the partitioning column `created_at` in the primary key, which MySQL requires for all unique indexes on partitioned tables.
- The keyset pagination example correctly illustrates the performance difference vs LIMIT/OFFSET on large datasets.
- The `table_rows` column from `information_schema.tables` is noted to be an estimate for InnoDB (not exact), but this is acceptable for the "verify table size" use case described.
- The `mysql.innodb_table_stats` table is specific to InnoDB. If a reader uses a different storage engine, this query would not return results. However, InnoDB is the default and overwhelmingly dominant storage engine, so this is a reasonable assumption.
