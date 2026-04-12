# How to Identify Unused Indexes in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Index, Performance Schema, Optimization, Maintenance

Description: Learn how to identify unused indexes in MySQL using performance_schema and sys schema views, safely test removal with invisible indexes, and reduce write overhead.

---

## Why Unused Indexes Are a Problem

Every index on a table must be updated on every INSERT, UPDATE, and DELETE. An index that no query ever reads still imposes the same write penalty. Identifying and removing unused indexes reduces write amplification and frees storage.

## The performance_schema Approach

The `table_io_waits_summary_by_index_usage` table tracks how many times each index has been read since the last server restart or counter reset:

```sql
SELECT
    OBJECT_SCHEMA AS db,
    OBJECT_NAME   AS table_name,
    INDEX_NAME,
    COUNT_READ,
    COUNT_FETCH
FROM performance_schema.table_io_waits_summary_by_index_usage
WHERE OBJECT_SCHEMA = 'your_database'
  AND INDEX_NAME IS NOT NULL
  AND INDEX_NAME != 'PRIMARY'
  AND COUNT_READ = 0
  AND COUNT_FETCH = 0
ORDER BY OBJECT_NAME, INDEX_NAME;
```

Indexes with `COUNT_READ = 0` have not been used for any read operation.

## The sys Schema Shortcut

```sql
SELECT object_schema, object_name, index_name
FROM sys.schema_unused_indexes
WHERE object_schema = 'your_database';
```

This view queries the same `performance_schema` table but filters on `COUNT_STAR = 0` (no I/O events at all), which is slightly more conservative than filtering on `COUNT_READ = 0` alone as in the manual query above.

## Ensuring Representative Coverage

The counters accumulate only since the last server start or the last `TRUNCATE` of the table. Before drawing conclusions, ensure the server has been running long enough to capture a full workload cycle - including month-end batch jobs, reports, and other periodic processes.

```sql
-- Check server uptime
SHOW STATUS LIKE 'Uptime';

-- Reset counters if needed (e.g., after a schema change)
TRUNCATE TABLE performance_schema.table_io_waits_summary_by_index_usage;
```

## Cross-Checking with EXPLAIN

Even if an index shows zero reads, verify by running `EXPLAIN` against your key queries:

```sql
EXPLAIN SELECT id FROM orders WHERE customer_id = 42 AND status = 'pending'\G
```

If the index you are evaluating does not appear in `key`, it is genuinely unused for that query.

## Safe Removal Using Invisible Indexes

Before dropping a potentially unused index, make it invisible first and monitor for regressions:

```sql
-- Step 1: hide the index
ALTER TABLE orders ALTER INDEX idx_legacy_status INVISIBLE;

-- Step 2: observe for 48 hours
-- Step 3: if no regressions, drop it
ALTER TABLE orders DROP INDEX idx_legacy_status;

-- Step 3b: if regressions occur, restore visibility
ALTER TABLE orders ALTER INDEX idx_legacy_status VISIBLE;
```

## Writing to Disk for Review

Export the list of unused index candidates:

```bash
mysql -u root -p your_database -e "
SELECT object_name, index_name
FROM sys.schema_unused_indexes
WHERE object_schema = 'your_database'" > unused_indexes.txt
```

## Summary

Use `sys.schema_unused_indexes` or `performance_schema.table_io_waits_summary_by_index_usage` to find indexes with zero read activity. Ensure the observation window covers all workload patterns, cross-check with `EXPLAIN`, and use invisible indexes as a safe intermediate step before permanently dropping any index.
