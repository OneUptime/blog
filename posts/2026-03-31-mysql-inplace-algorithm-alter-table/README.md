# What Is the INPLACE Algorithm for ALTER TABLE in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, ALTER TABLE, INPLACE Algorithm, Online DDL, Schema Change, InnoDB, Database

Description: The INPLACE algorithm in MySQL performs schema changes without a full table rebuild, reducing downtime and I/O overhead for many common ALTER TABLE operations.

---

## Overview

When you run an `ALTER TABLE` statement in MySQL, the server must decide how to apply the change internally. MySQL supports three DDL algorithms: `COPY`, `INPLACE`, and `INSTANT`. The `INPLACE` algorithm is the middle ground: it avoids creating a full temporary copy of the table and instead modifies the data in-place, often allowing concurrent reads and writes during the operation.

Understanding when and how `INPLACE` is selected helps you plan schema changes in production with minimal disruption.

## How INPLACE Differs from COPY

The `COPY` algorithm creates a new table with the new schema, copies all rows, and swaps the files at the end. It locks the table for writes throughout and generates significant I/O. The `INPLACE` algorithm avoids that full rebuild for many operations by applying structural changes directly to the existing tablespace files. However, it may still rebuild the table internally for some operations (such as adding a regular column in older MySQL versions) while still allowing concurrent DML.

The `INSTANT` algorithm is even faster and was introduced in MySQL 8.0, but it only supports a narrow set of operations like adding a column at the end of a table.

## Specifying the Algorithm

You can explicitly request `INPLACE` using the `ALGORITHM` clause:

```sql
ALTER TABLE orders
  ADD INDEX idx_customer_id (customer_id),
  ALGORITHM=INPLACE,
  LOCK=NONE;
```

If the requested algorithm is not supported for the operation, MySQL returns an error instead of silently falling back to a slower method. This is useful in production scripts where you want to fail fast rather than unexpectedly block writes.

## Common Operations That Support INPLACE

Many common DDL operations support `INPLACE` in InnoDB:

```sql
-- Adding an index (allows concurrent reads and writes)
ALTER TABLE products
  ADD INDEX idx_sku (sku),
  ALGORITHM=INPLACE, LOCK=NONE;

-- Dropping an index
ALTER TABLE products
  DROP INDEX idx_old_sku,
  ALGORITHM=INPLACE, LOCK=NONE;

-- Renaming an index (MySQL 5.7+)
ALTER TABLE products
  RENAME INDEX idx_sku TO idx_product_sku,
  ALGORITHM=INPLACE, LOCK=NONE;

-- Changing a column default
ALTER TABLE users
  ALTER COLUMN status SET DEFAULT 'active',
  ALGORITHM=INPLACE, LOCK=NONE;

-- Adding or dropping a virtual generated column
ALTER TABLE events
  ADD COLUMN event_year INT AS (YEAR(event_date)) VIRTUAL,
  ALGORITHM=INPLACE, LOCK=NONE;
```

## Operations That Require INPLACE but Rebuild the Table

Some operations use `INPLACE` but still perform an internal table rebuild. They support concurrent DML (with `LOCK=NONE`), but they take longer than truly in-place operations because the data files are rewritten:

```sql
-- Dropping a column (rebuilds, but allows DML)
ALTER TABLE orders
  DROP COLUMN legacy_notes,
  ALGORITHM=INPLACE, LOCK=NONE;

-- Adding NOT NULL to a column (rebuilds, but allows DML)
ALTER TABLE products
  MODIFY COLUMN description VARCHAR(500) NOT NULL,
  ALGORITHM=INPLACE, LOCK=NONE;

-- Changing the ROW_FORMAT
ALTER TABLE logs
  ROW_FORMAT=COMPRESSED,
  ALGORITHM=INPLACE, LOCK=NONE;
```

## Monitoring an INPLACE Operation

For long-running `INPLACE` operations, you can track progress using Performance Schema:

```sql
SELECT
  EVENT_NAME,
  WORK_COMPLETED,
  WORK_ESTIMATED
FROM performance_schema.events_stages_current
WHERE EVENT_NAME LIKE '%alter%';
```

You can also check the InnoDB online DDL status:

```sql
SHOW ENGINE INNODB STATUS\G
```

Look for the `SEMAPHORES` and `TRANSACTIONS` sections, which may show activity related to an in-progress DDL operation. For precise row-level progress tracking, use the Performance Schema query shown above.

## LOCK Options with INPLACE

The `LOCK` clause controls how much concurrency is allowed during the operation:

```sql
-- Allow full concurrent reads and writes (best for production)
ALTER TABLE transactions
  ADD INDEX idx_created_at (created_at),
  ALGORITHM=INPLACE, LOCK=NONE;

-- Allow concurrent reads but not writes
ALTER TABLE transactions
  ADD INDEX idx_created_at (created_at),
  ALGORITHM=INPLACE, LOCK=SHARED;

-- Block all access (rarely needed with INPLACE)
ALTER TABLE transactions
  ADD INDEX idx_created_at (created_at),
  ALGORITHM=INPLACE, LOCK=EXCLUSIVE;
```

For most index operations, `LOCK=NONE` is safe and preferred.

## When INPLACE Falls Back to COPY

If you specify `ALGORITHM=INPLACE` for an operation that does not support it, MySQL raises an error:

```text
ERROR 1846 (0A000): ALGORITHM=INPLACE is not supported.
Reason: Cannot change column type INPLACE. Try ALGORITHM=COPY.
```

Operations that typically require `COPY` include changing a column from `INT` to `VARCHAR`, or adding a primary key to a table that already has data in certain edge cases.

## Summary

The `INPLACE` algorithm is the workhorse of MySQL's Online DDL system. It covers a wide range of schema changes including index additions, drops, renames, and column modifications while supporting concurrent DML. By explicitly specifying `ALGORITHM=INPLACE, LOCK=NONE` in your production ALTER TABLE statements, you can ensure that schema changes do not unexpectedly lock your tables and that operations fail predictably when the requested algorithm is unsupported.
