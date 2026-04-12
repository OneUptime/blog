# Validation Summary: How to Understand InnoDB Secondary Indexes in MySQL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL 8.0+
- InnoDB storage engine
- Secondary indexes and B-tree structures
- Covering indexes
- Composite index design
- performance_schema and information_schema for index monitoring
- mysql.innodb_index_stats for index size estimation

## Sources Consulted
- MySQL 8.0 Reference Manual — Clustered and Secondary Indexes: https://dev.mysql.com/doc/refman/8.0/en/innodb-index-types.html
- MySQL 8.0 Reference Manual — InnoDB Persistent Statistics: https://dev.mysql.com/doc/refman/8.0/en/innodb-persistent-stats.html
- MySQL 8.0 Reference Manual — EXPLAIN Output Format: https://dev.mysql.com/doc/refman/8.0/en/explain-output.html
- MySQL 8.0 Reference Manual — The INFORMATION_SCHEMA STATISTICS Table: https://dev.mysql.com/doc/refman/8.0/en/information-schema-statistics-table.html
- MySQL 8.0 Reference Manual — performance_schema table_io_waits_summary_by_index_usage: https://dev.mysql.com/doc/refman/8.0/en/performance-schema-table-io-waits-summary-by-index-usage-table.html

## Issues Found

### 1. Incorrect index size calculation alias
- **What was wrong:** The query `SELECT INDEX_NAME, STAT_VALUE * 16 / 1024 AS size_kb` had a unit mismatch. In `mysql.innodb_index_stats`, `STAT_VALUE` for `stat_name = 'size'` is a page count. Each InnoDB page is 16 KB by default, so `STAT_VALUE * 16` yields kilobytes, and dividing by 1024 yields megabytes — not kilobytes as the alias `size_kb` claimed.
- **What was changed:** Removed the `/ 1024` division so the formula is `STAT_VALUE * 16 AS size_kb`, which correctly produces the result in kilobytes.
- **Why:** The original formula and alias were inconsistent, which would confuse readers interpreting the output.

### 2. Incorrect subquery in "find tables with no indexes"
- **What was wrong:** The query used `NOT IN (SELECT DISTINCT TABLE_NAME FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = 'mydb')` but the outer query scanned all user schemas (everything not in `mysql`, `information_schema`, `performance_schema`). This mismatch means tables in other schemas could be incorrectly reported as having no indexes if no table with the same name exists in `mydb`.
- **What was changed:** Replaced the `NOT IN` subquery with a correlated `NOT EXISTS` subquery that matches both `TABLE_SCHEMA` and `TABLE_NAME`, ensuring correct results across all schemas.
- **Why:** The original query would produce false positives in multi-database environments.

## Review Notes
- The covering index example explicitly includes `order_id` in `idx_customer_covering(customer_id, created_at, order_id)`. Since `order_id` is the primary key, InnoDB automatically appends it to every secondary index, so `(customer_id, created_at)` alone would already be covering for a query selecting only those three columns. The explicit inclusion is not wrong — it makes the intent clearer — but readers should know the PK is implicitly present in all secondary indexes.
- The `performance_schema.table_io_waits_summary_by_index_usage` counters reset on server restart. The post could note this caveat so readers don't mistakenly drop indexes that appear unused after a recent restart.
- All SQL syntax is valid for MySQL 8.0+. The ENUM, DECIMAL, DATETIME types and CREATE INDEX syntax are all correct.
