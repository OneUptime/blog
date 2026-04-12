# How to Use UNION ALL in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, UNION ALL, Set Operation, SQL, Performance

Description: Learn how to use UNION ALL in MySQL to combine results from multiple SELECT statements while keeping all rows, including duplicates, for better performance.

---

## What Is UNION ALL?

`UNION ALL` combines the result sets of two or more `SELECT` statements and returns all rows including duplicates. Unlike `UNION`, it skips the deduplication step, making it faster and less memory-intensive. Use it when you know the data sets do not overlap, or when you intentionally want to keep duplicate rows.

```sql
-- Combine results keeping all rows (including duplicates)
SELECT city FROM customers
UNION ALL
SELECT city FROM suppliers;
```

## UNION ALL vs UNION

```sql
-- UNION: removes duplicates (requires sorting/hashing)
SELECT email FROM list_a
UNION
SELECT email FROM list_b;

-- UNION ALL: keeps all rows, no deduplication cost
SELECT email FROM list_a
UNION ALL
SELECT email FROM list_b;
```

The performance difference can be significant on large datasets because `UNION` requires MySQL to sort and compare all rows to identify duplicates.

## When to Use UNION ALL

### Appending Non-Overlapping Data Sets

```sql
-- Quarterly sales reports from separate tables (no overlap)
SELECT 'Q1' AS quarter, salesperson, amount FROM sales_q1_2025
UNION ALL
SELECT 'Q2' AS quarter, salesperson, amount FROM sales_q2_2025
UNION ALL
SELECT 'Q3' AS quarter, salesperson, amount FROM sales_q3_2025
UNION ALL
SELECT 'Q4' AS quarter, salesperson, amount FROM sales_q4_2025
ORDER BY quarter, salesperson;
```

### Combining Partitioned Tables

```sql
-- Log entries sharded by month into separate tables
SELECT id, user_id, action, created_at FROM logs_2025_01
UNION ALL
SELECT id, user_id, action, created_at FROM logs_2025_02
UNION ALL
SELECT id, user_id, action, created_at FROM logs_2025_03
ORDER BY created_at DESC
LIMIT 100;
```

### Aggregating Across Multiple Sources

```sql
-- Total revenue from all channels (no overlap between channels)
SELECT 'Online' AS channel, SUM(amount) AS revenue FROM online_orders
UNION ALL
SELECT 'In-Store' AS channel, SUM(amount) AS revenue FROM instore_orders
UNION ALL
SELECT 'Phone' AS channel, SUM(amount) AS revenue FROM phone_orders;
```

## Using UNION ALL in CTEs

```sql
-- Use UNION ALL inside a CTE for cleaner queries
WITH all_contacts AS (
    SELECT id, name, email, 'customer' AS type FROM customers
    UNION ALL
    SELECT id, name, email, 'vendor'   AS type FROM vendors
    UNION ALL
    SELECT id, name, email, 'employee' AS type FROM employees
)
SELECT type, COUNT(*) AS count
FROM all_contacts
GROUP BY type;
```

## UNION ALL for Recursive CTEs

`UNION ALL` is the standard operator in recursive CTEs to combine the base case with the recursive step. MySQL 8.0.19 and later also supports `UNION DISTINCT` in recursive CTEs, but `UNION ALL` is the most common choice:

```sql
-- Generate a sequence of numbers 1-10
WITH RECURSIVE numbers AS (
    SELECT 1 AS n
    UNION ALL
    SELECT n + 1 FROM numbers WHERE n < 10
)
SELECT n FROM numbers;

-- Traverse a category hierarchy
WITH RECURSIVE category_tree AS (
    SELECT id, name, parent_id, 0 AS depth
    FROM categories
    WHERE parent_id IS NULL  -- Root nodes

    UNION ALL

    SELECT c.id, c.name, c.parent_id, ct.depth + 1
    FROM categories c
    JOIN category_tree ct ON c.parent_id = ct.id
)
SELECT id, REPEAT('  ', depth) AS indent, name
FROM category_tree
ORDER BY id;
```

## Performance Comparison

```sql
-- Create a simple test to observe behavior
CREATE TABLE test_a (val INT);
CREATE TABLE test_b (val INT);
INSERT INTO test_a VALUES (1), (2), (3);
INSERT INTO test_b VALUES (2), (3), (4);

-- UNION: returns 4 rows (1, 2, 3, 4) - deduplication applied
SELECT val FROM test_a UNION SELECT val FROM test_b;

-- UNION ALL: returns 6 rows (1, 2, 3, 2, 3, 4) - all rows kept
SELECT val FROM test_a UNION ALL SELECT val FROM test_b;
```

## Summary

`UNION ALL` is the preferred choice when combining result sets that are known to be non-overlapping, or when you need to preserve all rows including duplicates. It is significantly faster than `UNION` because it skips the deduplication step. It is also required in recursive CTE definitions. Use `UNION` only when you specifically need duplicate elimination.
