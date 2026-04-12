# How to Find Unused Indexes with sys Schema in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, sys Schema, Index, Optimization, Schema Management

Description: Use the MySQL sys schema schema_unused_indexes view to identify indexes that are never used by queries, reducing write overhead and storage waste.

---

## Overview

Unused indexes waste storage space and slow down every INSERT, UPDATE, and DELETE operation because MySQL must maintain them even when they never benefit a query. The `sys` schema makes it trivial to find these indexes using the `schema_unused_indexes` view.

## Using schema_unused_indexes

```sql
SELECT
  object_schema,
  object_name,
  index_name
FROM sys.schema_unused_indexes
ORDER BY object_schema, object_name;
```

This view queries `performance_schema.table_io_waits_summary_by_index_usage` to identify indexes with zero usage (no read or write events) since the last server restart.

## Filtering to a Specific Schema

```sql
SELECT
  object_name AS table_name,
  index_name
FROM sys.schema_unused_indexes
WHERE object_schema = 'myapp'
ORDER BY object_name, index_name;
```

## Viewing the Underlying Data

The view draws from this Performance Schema table:

```sql
SELECT
  OBJECT_SCHEMA,
  OBJECT_NAME,
  INDEX_NAME,
  COUNT_STAR
FROM performance_schema.table_io_waits_summary_by_index_usage
WHERE INDEX_NAME IS NOT NULL
  AND INDEX_NAME != 'PRIMARY'
  AND COUNT_STAR = 0
  AND OBJECT_SCHEMA != 'mysql'
ORDER BY OBJECT_SCHEMA, OBJECT_NAME;
```

## Generating Drop Statements

To generate the DDL to remove unused indexes:

```sql
SELECT
  CONCAT(
    'ALTER TABLE `', object_schema, '`.`', object_name,
    '` DROP INDEX `', index_name, '`;'
  ) AS drop_statement
FROM sys.schema_unused_indexes
WHERE object_schema NOT IN ('mysql', 'sys', 'performance_schema', 'information_schema')
ORDER BY object_schema, object_name;
```

## Important Caveats

Before dropping an index, consider:

1. The server must have been running long enough for all query patterns to execute. A fresh restart resets the counters.
2. Some indexes are only used during batch jobs or scheduled reports - check if your monitoring window covers all workload types.
3. Primary keys and unique constraints enforce data integrity and cannot simply be dropped.
4. Indexes used by foreign keys may appear unused but are required.

## Verifying Index Usage Before Dropping

Always verify with EXPLAIN before dropping:

```sql
EXPLAIN SELECT * FROM orders WHERE status = 'pending';
```

If the index does not appear in the EXPLAIN output, it is genuinely unused for that query pattern.

## Enabling Required Instrumentation

```sql
UPDATE performance_schema.setup_instruments
SET ENABLED = 'YES', TIMED = 'YES'
WHERE NAME LIKE 'wait/io/table/%';

UPDATE performance_schema.setup_consumers
SET ENABLED = 'YES'
WHERE NAME = 'global_instrumentation';
```

## Summary

The `sys.schema_unused_indexes` view is a quick, reliable way to identify index bloat in MySQL. Regularly auditing unused indexes and removing them reduces write amplification, improves DML performance, and frees storage. Always run the audit after a representative workload period and validate with EXPLAIN before applying any changes.
