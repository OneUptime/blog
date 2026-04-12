# How to Use ANALYZE TABLE in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, ANALYZE TABLE, Query Optimization, Index Statistics

Description: Learn how to use ANALYZE TABLE in MySQL to update index statistics so the query optimizer makes accurate execution plan decisions.

---

## What Is ANALYZE TABLE

`ANALYZE TABLE` updates the index statistics that MySQL's query optimizer uses to choose execution plans. Stale statistics can cause the optimizer to pick suboptimal query plans - for example, using a full table scan instead of an available index.

## When to Run ANALYZE TABLE

- After loading large amounts of data
- After many `INSERT`, `UPDATE`, or `DELETE` operations
- When `EXPLAIN` shows unexpected full table scans
- When query performance degrades over time without schema changes

## Syntax

```sql
ANALYZE TABLE table_name;
ANALYZE TABLE table1, table2, table3;
```

## Example

```sql
ANALYZE TABLE orders;
```

```text
+----------+---------+----------+----------+
| Table    | Op      | Msg_type | Msg_text |
+----------+---------+----------+----------+
| mydb.orders | analyze | status | OK      |
+----------+---------+----------+----------+
```

## How Statistics Are Used by the Optimizer

Run `EXPLAIN` before and after to see the impact:

```sql
-- Before ANALYZE TABLE
EXPLAIN SELECT * FROM orders WHERE status = 'pending' AND created_at > '2026-01-01';
```

```text
+----+-------------+--------+------+----------------+------+---------+------+---------+-------------+
| id | select_type | table  | type | possible_keys  | key  | key_len | ref  | rows    | Extra       |
+----+-------------+--------+------+----------------+------+---------+------+---------+-------------+
|  1 | SIMPLE      | orders | ALL  | idx_status     | NULL | NULL    | NULL | 5000000 | Using where |
+----+-------------+--------+------+----------------+------+---------+------+---------+-------------+
```

After `ANALYZE TABLE`:

```text
+----+-------------+--------+------+----------------+------------+---------+------+-------+-------------+
| id | select_type | table  | type | possible_keys  | key        | key_len | ref  | rows  | Extra       |
+----+-------------+--------+------+----------------+------------+---------+------+-------+-------------+
|  1 | SIMPLE      | orders | ref  | idx_status     | idx_status | 4       | const| 12345 | Using where |
+----+-------------+--------+------+----------------+------------+---------+------+-------+-------------+
```

The optimizer now uses the index because it has accurate row counts.

## Viewing Index Statistics

```sql
SELECT
  TABLE_NAME,
  INDEX_NAME,
  COLUMN_NAME,
  CARDINALITY,
  NULLABLE
FROM information_schema.STATISTICS
WHERE TABLE_SCHEMA = 'mydb'
  AND TABLE_NAME = 'orders'
ORDER BY INDEX_NAME, SEQ_IN_INDEX;
```

`CARDINALITY` shows the estimated number of unique values in the index. Low cardinality on a high-cardinality column indicates stale stats.

## InnoDB and Automatic Statistics

InnoDB automatically updates statistics when:
- More than 10% of table rows change (with `innodb_stats_auto_recalc = ON`)
- The table is first opened after a restart (transient statistics only; persistent statistics are loaded from disk)

Configure automatic statistics updates:

```ini
[mysqld]
innodb_stats_auto_recalc = ON      # Default: ON
innodb_stats_persistent  = ON      # Persist stats across restarts
innodb_stats_persistent_sample_pages = 20  # Pages sampled for estimation (persistent stats)
```

Increase `innodb_stats_persistent_sample_pages` for more accurate (but slower) statistics:

```sql
SET GLOBAL innodb_stats_persistent_sample_pages = 50;
```

## Persistent vs Transient Statistics

With `innodb_stats_persistent = ON` (default), stats are stored in `mysql.innodb_table_stats` and `mysql.innodb_index_stats`:

```sql
SELECT * FROM mysql.innodb_table_stats WHERE table_name = 'orders';
SELECT * FROM mysql.innodb_index_stats WHERE table_name = 'orders';
```

## Automating with mysqlcheck

```bash
# Analyze all tables in a database
mysqlcheck -u root -p --analyze mydb

# Analyze all databases
mysqlcheck -u root -p --analyze --all-databases
```

## Summary

`ANALYZE TABLE` refreshes index statistics that the optimizer uses to build execution plans. Run it after bulk data changes or when `EXPLAIN` shows unexpected full table scans. InnoDB automatically recalculates stats for tables with significant data changes, but manual `ANALYZE TABLE` is useful for immediate, on-demand updates after large data loads.
