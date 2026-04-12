# How to Use UNION vs UNION ALL in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, UNION, UNION ALL, Set Operation, Performance, SQL

Description: Understand the differences between UNION and UNION ALL in MySQL and learn when to use each based on deduplication needs and performance requirements.

---

## Key Difference at a Glance

Both `UNION` and `UNION ALL` combine result sets from multiple SELECT statements, but they differ in one critical way:

- `UNION` - removes duplicate rows from the combined result
- `UNION ALL` - keeps all rows, including duplicates

```sql
CREATE TABLE list_a (email VARCHAR(100));
CREATE TABLE list_b (email VARCHAR(100));

INSERT INTO list_a VALUES ('alice@x.com'), ('bob@x.com'), ('carol@x.com');
INSERT INTO list_b VALUES ('bob@x.com'), ('carol@x.com'), ('dave@x.com');

-- UNION: 4 rows (duplicates removed)
SELECT email FROM list_a
UNION
SELECT email FROM list_b;
-- alice@x.com, bob@x.com, carol@x.com, dave@x.com

-- UNION ALL: 6 rows (all rows including duplicates)
SELECT email FROM list_a
UNION ALL
SELECT email FROM list_b;
-- alice@x.com, bob@x.com, carol@x.com, bob@x.com, carol@x.com, dave@x.com
```

## How MySQL Processes Each

```sql
-- UNION internally does:
-- 1. Execute both SELECTs
-- 2. Combine all rows into a temporary table
-- 3. Sort/hash all rows to find duplicates
-- 4. Remove duplicates
-- 5. Return result

-- UNION ALL internally does:
-- 1. Execute both SELECTs
-- 2. Stream rows directly to the result
-- (No deduplication step - much faster)
```

## When to Use UNION

Use `UNION` when you need to merge overlapping data sources and want unique results:

```sql
-- Get all unique cities where you have customers OR suppliers
SELECT city, 'Demand' AS type FROM customers
UNION
SELECT city, 'Supply' AS type FROM suppliers;
-- (Intentionally different source types - only deduplicated if city AND type match)

-- Find all distinct email addresses from multiple sources
SELECT email FROM customers WHERE email IS NOT NULL
UNION
SELECT email FROM newsletter_subscribers
UNION
SELECT email FROM trial_users;
-- Returns each unique email exactly once

-- Combine search results from different tables
SELECT id, title, 'article' AS content_type FROM articles WHERE title LIKE '%mysql%'
UNION
SELECT id, title, 'tutorial' AS content_type FROM tutorials WHERE title LIKE '%mysql%';
```

## When to Use UNION ALL

Use `UNION ALL` when data sets don't overlap or you need all rows:

```sql
-- Monthly partitions - no overlap between months
SELECT * FROM orders_jan_2025
UNION ALL
SELECT * FROM orders_feb_2025
UNION ALL
SELECT * FROM orders_mar_2025;

-- Count distinct vs total entries (intentional ALL)
SELECT 'Total entries' AS metric, COUNT(*) AS value FROM (
    SELECT email FROM list_a
    UNION ALL
    SELECT email FROM list_b
) combined

UNION ALL

SELECT 'Unique entries' AS metric, COUNT(*) AS value FROM (
    SELECT email FROM list_a
    UNION
    SELECT email FROM list_b
) unique_combined;

-- Recursive CTEs typically use UNION ALL (UNION DISTINCT also works since MySQL 8.0.19)
WITH RECURSIVE counter AS (
    SELECT 1 AS n
    UNION ALL
    SELECT n + 1 FROM counter WHERE n < 5
)
SELECT n FROM counter;
```

## Performance Comparison

```sql
-- Benchmark example showing the cost difference
-- Create tables with 100k rows each with 50% overlap

-- UNION: slower, requires dedup pass
EXPLAIN SELECT id FROM big_table_a UNION SELECT id FROM big_table_b;
-- Look for "Using temporary; Using filesort" in Extra column

-- UNION ALL: faster, no dedup
EXPLAIN SELECT id FROM big_table_a UNION ALL SELECT id FROM big_table_b;
-- No temporary table needed for deduplication
```

## Decision Flowchart

```text
Do the result sets contain rows that could be identical?
|
+-- NO --> Use UNION ALL (faster, no dedup needed)
|
+-- YES --> Do you want duplicates in the result?
            |
            +-- YES --> Use UNION ALL
            |
            +-- NO --> Use UNION (slower but returns unique rows)
```

## Side-by-Side Comparison Table

```text
Feature              | UNION          | UNION ALL
---------------------|----------------|------------------
Removes duplicates   | Yes            | No
Performance          | Slower         | Faster
Memory usage         | Higher         | Lower
Use in recursive CTE | Yes (since 8.0.19) | Yes
Row count            | <= combined    | = sum of all rows
Guaranteed order     | No (use ORDER BY) | No (use ORDER BY)
```

## Summary

Choose `UNION ALL` by default when combining non-overlapping data sets or partitioned tables - it is faster because it skips the deduplication step. Switch to `UNION` only when the data sources might contain identical rows and you want each unique combination to appear only once. Always think about whether duplicates are possible and whether they matter before choosing between the two.
