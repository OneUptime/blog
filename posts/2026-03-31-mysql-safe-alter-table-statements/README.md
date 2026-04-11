# How to Write Safe ALTER TABLE Statements in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, ALTER TABLE, Schema Migration, Online DDL

Description: Learn how to write ALTER TABLE statements in MySQL that minimize lock time, use online DDL, and avoid production downtime.

---

`ALTER TABLE` in MySQL can lock the table and block reads and writes for seconds to hours depending on table size and the change type. Understanding which operations are online versus offline is essential for zero-downtime deployments.

## Understanding Online DDL

MySQL InnoDB supports Online DDL for many `ALTER TABLE` operations, meaning the table remains readable and writable during the change.

```sql
-- Check what algorithm will be used
ALTER TABLE orders
    ADD COLUMN notes TEXT NULL,
    ALGORITHM=INPLACE, LOCK=NONE;
```

If the operation does not support `ALGORITHM=INPLACE, LOCK=NONE`, MySQL raises an error so you can choose an alternative tool.

## Operations and Their Lock Levels

```sql
-- ONLINE (no lock, fast) - adding a nullable column
ALTER TABLE users
    ADD COLUMN phone VARCHAR(20) NULL,
    ALGORITHM=INPLACE, LOCK=NONE;

-- ONLINE - adding an index
ALTER TABLE users
    ADD KEY idx_created (created_at),
    ALGORITHM=INPLACE, LOCK=NONE;

-- OFFLINE (table copy, blocks writes) - changing column type
ALTER TABLE users
    MODIFY COLUMN bio MEDIUMTEXT NOT NULL;

-- ONLINE (inplace) - adding a NOT NULL column without default uses implicit type default
ALTER TABLE users
    ADD COLUMN score INT NOT NULL,
    ALGORITHM=INPLACE, LOCK=NONE;
```

## Safe Patterns for Common Changes

### Adding a NOT NULL Column Safely

Adding a NOT NULL column is online even without a default (MySQL uses the implicit type default), but specifying one explicitly is recommended for clarity and application compatibility:

```sql
-- Step 1: add with default (online)
ALTER TABLE users
    ADD COLUMN score INT NOT NULL DEFAULT 0,
    ALGORITHM=INPLACE, LOCK=NONE;

-- Step 2: if you want no default
ALTER TABLE users
    ALTER COLUMN score DROP DEFAULT;
```

### Changing a Column Type

For large tables, use pt-online-schema-change or gh-ost instead. For small tables:

```sql
ALTER TABLE config
    MODIFY COLUMN value VARCHAR(1000) NOT NULL,
    ALGORITHM=COPY;
```

### Adding a Unique Index

```sql
ALTER TABLE users
    ADD UNIQUE KEY uq_phone (phone),
    ALGORITHM=INPLACE, LOCK=NONE;
```

## Batching Multiple Changes

Group multiple `ALTER TABLE` changes in a single statement to reduce the number of table rebuilds:

```sql
-- One rebuild instead of three
ALTER TABLE products
    ADD COLUMN weight_kg   DECIMAL(8,3)  NULL,
    ADD COLUMN dimensions  VARCHAR(50)   NULL,
    ADD KEY idx_weight (weight_kg),
    ALGORITHM=INPLACE, LOCK=NONE;
```

## Checking Alter Progress

For long-running alters, monitor progress via performance_schema:

```sql
SELECT EVENT_NAME, WORK_COMPLETED, WORK_ESTIMATED,
       ROUND(WORK_COMPLETED / WORK_ESTIMATED * 100, 1) AS pct_done
FROM   performance_schema.events_stages_current
WHERE  EVENT_NAME LIKE '%alter%';
```

## Setting a Wait Timeout

Prevent the ALTER from waiting indefinitely on a metadata lock:

```sql
-- Wait at most 5 seconds for a metadata lock, then fail
SET SESSION lock_wait_timeout = 5;
ALTER TABLE orders
    ADD COLUMN priority TINYINT NOT NULL DEFAULT 0,
    ALGORITHM=INPLACE, LOCK=NONE;
```

## Summary

Always specify `ALGORITHM=INPLACE, LOCK=NONE` and let MySQL raise an error if the operation does not support it. Batch multiple column changes in one statement. For operations that require a table copy, use pt-online-schema-change or gh-ost on large tables. Monitor progress through `performance_schema.events_stages_current`.
