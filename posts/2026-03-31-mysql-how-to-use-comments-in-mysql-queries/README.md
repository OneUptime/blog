# How to Use Comments in MySQL Queries

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, SQL Comments, Query Hint, Best Practice, Documentation

Description: Learn the different comment styles in MySQL, how to use them for documentation and conditional code, and how optimizer hints use the comment syntax.

---

## Comment Styles in MySQL

MySQL supports three comment styles:

### 1 - Hash Comment (Single Line)

```sql
SELECT id, name FROM customers; # Hash comments go to end of line
SELECT id, name FROM customers
WHERE status = 'active'; # Another hash comment
```

### 2 - Double Dash Comment (Single Line)

```sql
SELECT id, name  -- Get customer ID and name
FROM customers   -- From the customers table
WHERE status = 'active';
```

Note: The double-dash style requires a space after `--` to avoid ambiguity with expressions like `a--b` (which could mean `a - (-b)`).

### 3 - C-Style Block Comment (Multi-Line)

```sql
/*
  Query: Get all active customers with their order counts
  Author: nawazdhandala
  Date: 2026-03-31
*/
SELECT
  c.id,
  c.name,
  COUNT(o.id) AS order_count  /* total number of orders */
FROM customers c
LEFT JOIN orders o ON c.id = o.customer_id
WHERE c.status = 'active'
GROUP BY c.id, c.name;
```

## Inline Column Comments

Use block comments to add context to individual expressions:

```sql
SELECT
  order_id,
  unit_price * quantity AS line_total,          /* before discount */
  unit_price * quantity * (1 - discount) AS net  /* after discount applied */
FROM order_items;
```

## Commenting Out Code for Debugging

Block comments are useful for temporarily disabling parts of a query:

```sql
SELECT
  c.id,
  c.name,
  c.email
  /* , c.phone   -- Removed: phone data not needed for this report */
FROM customers c
WHERE c.created_at > '2025-01-01'
  /* AND c.country = 'US'  -- Temporarily disabled for global report */
ORDER BY c.created_at DESC;
```

## Executable Comments (MySQL-Specific Extensions)

MySQL uses a special comment syntax `/*!` for version-conditional SQL. The code inside runs only on MySQL (not on other databases like PostgreSQL):

```sql
CREATE TABLE t1 (id INT) /*!ENGINE=InnoDB*/;
```

Version-specific execution: `/*!80013` means execute on MySQL 8.0.13 and later:

```sql
ALTER TABLE products ADD COLUMN tags JSON /*!80013, ALGORITHM=INSTANT*/;
```

This is used extensively by `mysqldump` to generate portable SQL that adds MySQL-specific options when restored on MySQL but is ignored elsewhere.

## Optimizer Hints via Comments

MySQL 8 uses the `/*+ ... */` syntax for optimizer hints. These are recognized by the optimizer and affect query execution:

```sql
-- Force a specific index
SELECT /*+ INDEX(orders idx_customer_id) */
  id, customer_id, total_amount
FROM orders
WHERE customer_id = 42;

-- Force a join order
SELECT /*+ JOIN_ORDER(c, o) */
  c.name, o.total_amount
FROM customers c
JOIN orders o ON c.id = o.customer_id;

-- Set resource group for this query
SELECT /*+ RESOURCE_GROUP(reporting_group) */
  SUM(revenue) FROM sales GROUP BY year;

-- Disable hash join for this query (MySQL 8.0.20+)
SELECT /*+ NO_BNL(o, c) */
  o.id, c.name
FROM orders o JOIN customers c ON o.customer_id = c.id;
```

Optimizer hints inside `/*+ */` are treated as regular comments by most other SQL databases (such as PostgreSQL and SQL Server), making queries portable. Note that Oracle Database also recognizes `/*+ */` for its own optimizer hints, so hints may be interpreted differently there.

## Documenting Stored Procedures

```sql
DELIMITER $$

CREATE PROCEDURE process_pending_orders()
BEGIN
  /*
   * Process all orders in 'pending' status older than 24 hours.
   * Marks them as 'processing' and logs the batch.
   * Called by: nightly_cron_job.sh
   * See also: cleanup_stale_orders()
   */
  DECLARE v_batch_id INT;

  -- Create an audit entry for this batch
  INSERT INTO processing_batches (started_at) VALUES (NOW());
  SET v_batch_id = LAST_INSERT_ID();

  -- Update pending orders older than 24 hours
  UPDATE orders
  SET status = 'processing',
      batch_id = v_batch_id,
      updated_at = NOW()
  WHERE status = 'pending'
    AND created_at < NOW() - INTERVAL 24 HOUR;

  -- Log how many were updated
  UPDATE processing_batches
  SET rows_processed = ROW_COUNT(), completed_at = NOW()
  WHERE id = v_batch_id;
END$$

DELIMITER ;
```

## Passing Metadata in Comments (ProxySQL and Application Routing)

Some connection poolers and proxies (like ProxySQL) can route queries based on comment content:

```sql
-- Route to replica for reporting queries
SELECT /* read_replica */ SUM(revenue) FROM sales WHERE year = 2025;

-- Route to primary for write-sensitive reads
SELECT /* primary_only */ balance FROM accounts WHERE id = 1 FOR UPDATE;
```

## Summary

MySQL supports three comment styles: `#`, `--` (with space), and `/* */` block comments. Block comments are best for multi-line documentation in stored procedures and complex queries. The special `/*!` and `/*+ */` syntaxes enable MySQL-conditional execution and optimizer hints respectively, allowing you to embed MySQL-specific behavior while keeping SQL portable across database systems.
