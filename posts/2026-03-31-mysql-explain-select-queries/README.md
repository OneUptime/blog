# How to Use EXPLAIN for SELECT Queries in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, EXPLAIN, Query Optimization, Performance, SELECT

Description: Learn how to use EXPLAIN with SELECT queries in MySQL to understand the execution plan and identify performance bottlenecks.

---

## Overview

`EXPLAIN` is MySQL's primary tool for understanding how the optimizer executes SELECT queries. It reveals which indexes are used, how tables are joined, and how many rows are scanned - information critical for query tuning.

## Basic EXPLAIN Usage

Prefix any SELECT query with EXPLAIN:

```sql
EXPLAIN SELECT * FROM orders WHERE customer_id = 42;
```

MySQL returns one or more rows describing the execution plan without actually running the query.

## Key EXPLAIN Output Columns

### id
The SELECT identifier. Queries with subqueries show multiple IDs. Higher ID values are typically executed first.

### select_type
Describes the type of SELECT:
- `SIMPLE` - no subqueries or unions
- `PRIMARY` - outermost SELECT when subqueries or unions are present
- `SUBQUERY` - inner SELECT in a subquery
- `DERIVED` - subquery in a FROM clause

### type
The join type, ordered from best to worst:
- `system` / `const` - at most one matching row
- `eq_ref` - one row per row from previous table (primary key join)
- `ref` - multiple rows from an index
- `range` - index range scan
- `index` - full index scan
- `ALL` - full table scan (worst case)

### key
The index MySQL actually used. NULL means no index was used.

### rows
Estimated number of rows MySQL needs to examine. Lower is better.

### Extra
Additional information, including:
- `Using index` - covered by index, no table lookup needed
- `Using where` - WHERE filter applied after index lookup
- `Using filesort` - extra sort pass required
- `Using temporary` - temporary table used

## Reading a Simple EXPLAIN

```sql
EXPLAIN SELECT * FROM orders
WHERE customer_id = 42 AND status = 'pending';
```

Example output:
```text
id | select_type | table  | type | possible_keys          | key                | rows | Extra
 1 | SIMPLE      | orders | ref  | idx_customer_id,status | idx_customer_id    |   15 | Using where
```

This shows MySQL uses `idx_customer_id`, scans an estimated 15 rows, and applies a WHERE filter after the index lookup.

## Analyzing a JOIN Query

```sql
EXPLAIN SELECT o.id, c.name
FROM orders o
JOIN customers c ON o.customer_id = c.id
WHERE o.status = 'pending';
```

EXPLAIN returns two rows - one per table. The order of rows shows the join sequence the optimizer chose.

## Identifying Full Table Scans

A `type` value of `ALL` indicates a full table scan:

```sql
EXPLAIN SELECT * FROM orders WHERE note LIKE '%urgent%';
```

The LIKE pattern starts with `%`, preventing index use. Consider using FULLTEXT search for such queries.

## Using EXPLAIN ANALYZE for Actual Metrics (MySQL 8+)

In MySQL 8, `EXPLAIN ANALYZE` runs the query and shows actual row counts and timing:

```sql
EXPLAIN ANALYZE SELECT * FROM orders WHERE customer_id = 42;
```

This is more accurate than regular EXPLAIN, which only shows estimates.

## Monitoring Query Performance with OneUptime

After optimizing queries using EXPLAIN, monitor your MySQL database with OneUptime to track query response times and set alerts for slow query thresholds.

## Summary

`EXPLAIN` reveals how MySQL executes SELECT queries, including which indexes are used, join types, and estimated row counts. Focus on the `type`, `key`, and `Extra` columns to identify bottlenecks. In MySQL 8, use `EXPLAIN ANALYZE` to see actual execution statistics rather than estimates.
