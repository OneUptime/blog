# How to Use ANALYZE TABLE to Update Index Statistics in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, ANALYZE TABLE, Index Statistics, Query Optimization, Performance

Description: Learn how to use ANALYZE TABLE in MySQL to refresh index statistics so the query optimizer makes accurate execution plan decisions.

---

## Overview

MySQL's query optimizer uses index statistics to decide the most efficient way to execute a query. These statistics include estimates of row counts, index cardinality, and data distribution. Over time, as rows are inserted, updated, or deleted, these statistics can become stale, causing the optimizer to choose suboptimal query plans.

`ANALYZE TABLE` updates these statistics by sampling the table data, helping the optimizer make better decisions.

## Basic Syntax

```sql
ANALYZE TABLE table_name;
```

You can analyze multiple tables in a single statement:

```sql
ANALYZE TABLE orders, products, users;
```

## Running ANALYZE TABLE

```sql
ANALYZE TABLE orders;
```

```text
+-------------+---------+----------+----------+
| Table       | Op      | Msg_type | Msg_text |
+-------------+---------+----------+----------+
| myapp.orders| analyze | status   | OK       |
+-------------+---------+----------+----------+
```

The output confirms the operation completed successfully.

## When to Run ANALYZE TABLE

Run `ANALYZE TABLE` when:

- Queries suddenly become slow after bulk data loads
- `EXPLAIN` shows unexpectedly high row estimates
- After loading large amounts of data via `INSERT` or `LOAD DATA`
- After deleting a significant portion of table rows
- Index cardinality shown by `SHOW INDEX` looks wrong

```sql
-- Check current index cardinality
SHOW INDEX FROM orders;
```

```text
+--------+------------+-----------+--------------+-------------+-----------+
| Table  | Non_unique | Key_name  | Seq_in_index | Column_name | Cardinality |
+--------+------------+-----------+--------------+-------------+-----------+
| orders |          0 | PRIMARY   |            1 | id          | 1048576   |
| orders |          1 | idx_user  |            1 | user_id     | 512       |
+--------+------------+-----------+--------------+-------------+-----------+
```

If cardinality values are wildly off from reality, run `ANALYZE TABLE`.

## Effect on the Query Optimizer

Compare query plans before and after:

```sql
-- Before ANALYZE TABLE (stale statistics)
EXPLAIN SELECT * FROM orders WHERE user_id = 42 AND status = 'paid';
-- May show: type=ALL (full table scan), rows=100000

-- Run ANALYZE TABLE
ANALYZE TABLE orders;

-- After ANALYZE TABLE (fresh statistics)
EXPLAIN SELECT * FROM orders WHERE user_id = 42 AND status = 'paid';
-- Should show: type=ref, rows=15 (accurate estimate using index)
```

## Automating with innodb_stats_auto_recalc

InnoDB can automatically update statistics when a table changes significantly. This is controlled by the `innodb_stats_auto_recalc` variable:

```sql
SHOW VARIABLES LIKE 'innodb_stats_auto_recalc';
```

```text
+--------------------------+-------+
| Variable_name            | Value |
+--------------------------+-------+
| innodb_stats_auto_recalc | ON    |
+--------------------------+-------+
```

When `ON`, InnoDB recalculates statistics automatically after approximately 10% of the table rows change. However, for large tables this threshold may mean statistics are rarely updated, so manual `ANALYZE TABLE` is still useful.

## Controlling Statistics Sampling

You can control how many pages InnoDB samples to compute statistics:

```sql
-- Per-table sampling size (MySQL 5.6+)
ALTER TABLE orders STATS_SAMPLE_PAGES = 50;

-- Global default (for persistent statistics, which is the default mode)
SET GLOBAL innodb_stats_persistent_sample_pages = 20;
```

Higher sampling values give more accurate statistics but take longer to compute.

## Persistent vs Transient Statistics

By default, InnoDB persists statistics to the `mysql.innodb_table_stats` and `mysql.innodb_index_stats` tables:

```sql
SELECT * FROM mysql.innodb_index_stats
WHERE table_name = 'orders' AND stat_name = 'n_diff_pfx01';
```

```text
+---------------+------------+-----------+--------------+------------+
| database_name | table_name | index_name| stat_name    | stat_value |
+---------------+------------+-----------+--------------+------------+
| myapp         | orders     | idx_user  | n_diff_pfx01 | 8421       |
+---------------+------------+-----------+--------------+------------+
```

After running `ANALYZE TABLE`, these values are updated.

## Running ANALYZE TABLE in a Maintenance Script

```bash
#!/bin/bash
# Analyze all tables in a database
mysql -u root -p"${DB_PASSWORD}" "${DB_NAME}" -e "
SELECT CONCAT('ANALYZE TABLE \`', table_name, '\`;') AS stmt
FROM information_schema.tables
WHERE table_schema = '${DB_NAME}'
  AND table_type = 'BASE TABLE';
" --batch --skip-column-names | mysql -u root -p"${DB_PASSWORD}" "${DB_NAME}"
```

## Summary

`ANALYZE TABLE` updates index cardinality and distribution statistics that MySQL's query optimizer relies on to build efficient execution plans. Run it after bulk inserts, large deletes, or whenever `EXPLAIN` output shows unexpectedly poor estimates. While `innodb_stats_auto_recalc` handles routine updates automatically, manual `ANALYZE TABLE` is essential after major data changes to ensure optimal query performance.
