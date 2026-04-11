# What Is an Invisible Index in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Invisible Index, Index

Description: Learn what a MySQL invisible index is, how to use it to test index removal safely, and how to toggle index visibility without dropping and recreating indexes.

---

An invisible index is an index that exists in MySQL but is ignored by the query optimizer. Introduced in MySQL 8.0, invisible indexes let you test the impact of removing an index without permanently dropping it - a safe, reversible way to evaluate index changes in production.

## Why Invisible Indexes Matter

Dropping an index in production is permanent. If a query was relying on it, performance degrades immediately. Before MySQL 8.0, the only safe way to test index removal was to drop it, measure impact, and recreate it - which could take hours on large tables.

Invisible indexes solve this: you mark an index invisible, observe query plans and performance, and then either drop it (if unneeded) or make it visible again (if needed).

## Making an Index Invisible

```sql
-- Create a table with an index
CREATE TABLE orders (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  customer_id INT NOT NULL,
  status      VARCHAR(20),
  INDEX idx_customer (customer_id)
) ENGINE=InnoDB;

-- Make the index invisible
ALTER TABLE orders ALTER INDEX idx_customer INVISIBLE;

-- The index still exists but the optimizer will not use it
SHOW INDEX FROM orders\G
-- Key_name: idx_customer
-- Visible: NO
```

## Testing Impact

After making an index invisible, run your production query patterns and check EXPLAIN to verify the optimizer uses a different plan.

```sql
-- After making idx_customer invisible:
EXPLAIN SELECT * FROM orders WHERE customer_id = 42\G
-- type: ALL (full table scan - optimizer not using invisible index)
-- This shows what would happen if the index were dropped
```

## Making an Index Visible Again

If you discover the invisible index is needed, restore it instantly without rebuilding:

```sql
ALTER TABLE orders ALTER INDEX idx_customer VISIBLE;

-- Optimizer uses it again immediately
EXPLAIN SELECT * FROM orders WHERE customer_id = 42\G
-- key: idx_customer
```

## Creating an Index as Invisible

You can create an index as invisible from the start, which is useful for building an index without it immediately affecting existing query plans.

```sql
-- Build the index without changing any query plans
ALTER TABLE large_table ADD INDEX idx_new_col (new_col) INVISIBLE;

-- Analyze selectivity and query plans first
EXPLAIN SELECT * FROM large_table WHERE new_col = 'value';

-- Enable when ready
ALTER TABLE large_table ALTER INDEX idx_new_col VISIBLE;
```

## Force Using an Invisible Index

The optimizer ignores invisible indexes by default, but you can override this for testing with the `use_invisible_indexes` optimizer switch.

```sql
-- Allow the optimizer to use invisible indexes (testing purposes only)
SET SESSION optimizer_switch = 'use_invisible_indexes=on';

SELECT * FROM orders WHERE customer_id = 42;

-- Disable again after testing
SET SESSION optimizer_switch = 'use_invisible_indexes=off';
```

## Viewing All Indexes and Visibility

```sql
-- Show all indexes with visibility status
SELECT
  TABLE_NAME,
  INDEX_NAME,
  COLUMN_NAME,
  IS_VISIBLE
FROM information_schema.STATISTICS
WHERE TABLE_SCHEMA = DATABASE()
ORDER BY TABLE_NAME, INDEX_NAME;
```

## Practical Workflow

```sql
-- Step 1: Identify a potentially unused index
SELECT object_name, index_name, count_star
FROM performance_schema.table_io_waits_summary_by_index_usage
WHERE index_name != 'PRIMARY'
  AND count_star = 0
  AND object_schema = DATABASE();

-- Step 2: Make it invisible
ALTER TABLE orders ALTER INDEX idx_old_col INVISIBLE;

-- Step 3: Monitor for a week (or use slow query log)
-- Step 4a: If no issues, drop it
ALTER TABLE orders DROP INDEX idx_old_col;
-- Step 4b: If issues found, restore it instantly
ALTER TABLE orders ALTER INDEX idx_old_col VISIBLE;
```

## Summary

Invisible indexes in MySQL 8.0 let you disable an index from the optimizer's perspective without dropping it. Use them to safely test the impact of removing an index in production before committing to the change. The index remains maintained on writes (still incurs overhead) but is invisible to the query planner. Toggle visibility with `ALTER TABLE ... ALTER INDEX ... INVISIBLE/VISIBLE` and use `performance_schema` to identify candidate indexes for removal.
