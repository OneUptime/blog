# How to Use Invisible Indexes in MySQL 8

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Invisible Index, Index, Query Optimization

Description: Invisible indexes in MySQL 8.0 allow you to hide an index from the query optimizer without dropping it, making it safe to test the impact of removing an index.

---

## Overview

Invisible indexes were introduced in MySQL 8.0. An invisible index is maintained by MySQL as data changes - it stays current - but is ignored by the query optimizer when selecting a query plan. This allows you to safely test what happens when an index is removed without actually deleting it.

This is particularly useful for validating that dropping an index will not degrade query performance before committing to the change.

## Making an Index Invisible

```sql
-- Make an existing index invisible
ALTER TABLE orders
ALTER INDEX idx_customer_id INVISIBLE;

-- Create an index that starts invisible
CREATE INDEX idx_status ON orders (status) INVISIBLE;
```

## Making an Index Visible Again

```sql
ALTER TABLE orders
ALTER INDEX idx_customer_id VISIBLE;
```

## Creating an Invisible Index at Table Creation

```sql
CREATE TABLE events (
  id INT PRIMARY KEY AUTO_INCREMENT,
  event_type VARCHAR(50),
  created_at DATETIME,
  INDEX idx_type (event_type),
  INDEX idx_created (created_at) INVISIBLE
);
```

## Checking Index Visibility

```sql
-- View visibility status of all indexes
SELECT index_name, is_visible
FROM information_schema.statistics
WHERE table_schema = 'mydb'
AND table_name = 'orders'
GROUP BY index_name, is_visible;

-- Or via SHOW INDEX
SHOW INDEX FROM orders\G
-- Visible column shows YES/NO
```

## Using EXPLAIN to Verify Behavior Change

```sql
-- Before making invisible (optimizer uses idx_status)
EXPLAIN SELECT * FROM orders WHERE status = 'pending'\G
-- key: idx_status

-- After making invisible
ALTER TABLE orders ALTER INDEX idx_status INVISIBLE;

-- Optimizer no longer sees it
EXPLAIN SELECT * FROM orders WHERE status = 'pending'\G
-- key: NULL, type: ALL (full table scan)
```

## Forcing the Optimizer to Use an Invisible Index

For testing, you can enable an invisible index for the current session:

```sql
-- Enable invisible index usage for testing
SET SESSION optimizer_switch = 'use_invisible_indexes=on';

-- Now the invisible index can be used
EXPLAIN SELECT * FROM orders WHERE status = 'pending'\G
-- key: idx_status (visible again for this session)

-- Reset to normal
SET SESSION optimizer_switch = 'use_invisible_indexes=off';
```

## Safe Index Removal Workflow

The recommended workflow for removing an index:

```sql
-- Step 1: Make the index invisible
ALTER TABLE orders ALTER INDEX idx_status INVISIBLE;

-- Step 2: Monitor application performance (hours or days)
-- Check slow query log, monitoring dashboards

-- Step 3a: If performance is fine, drop the index
ALTER TABLE orders DROP INDEX idx_status;

-- Step 3b: If performance degraded, restore visibility immediately
ALTER TABLE orders ALTER INDEX idx_status VISIBLE;
```

## Adding Indexes Invisibly

You can add a new index invisibly first to avoid any optimizer interference during the build:

```sql
-- Add index but keep it invisible until ready
ALTER TABLE large_table
ADD INDEX idx_new_column (new_column) INVISIBLE;

-- Verify the index is correct
SELECT * FROM information_schema.statistics
WHERE table_name = 'large_table' AND index_name = 'idx_new_column';

-- Make visible when ready to use
ALTER TABLE large_table ALTER INDEX idx_new_column VISIBLE;
```

## Primary Key Cannot Be Made Invisible

```sql
-- This will error
ALTER TABLE orders ALTER INDEX PRIMARY INVISIBLE;
-- ERROR 3522: A primary key index cannot be invisible.
```

## Summary

Invisible indexes in MySQL 8.0 provide a safe, reversible way to test the impact of removing an index without the risk of permanently losing it. The key workflow is: make invisible, observe performance, then either drop permanently or restore visibility. Combined with `EXPLAIN` and the `use_invisible_indexes` session variable for testing, invisible indexes make index management significantly safer in production environments.
