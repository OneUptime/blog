# How MySQL Online DDL Works Internally

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Online DDL, ALTER TABLE, InnoDB, Schema Change

Description: Learn how MySQL InnoDB Online DDL handles ALTER TABLE operations with minimal locking, and how to choose the right algorithm for schema changes.

---

## What Is Online DDL

Online DDL allows MySQL to perform many schema changes (ALTER TABLE) while the table remains accessible for reads and writes. Before MySQL 5.6, most ALTER TABLE operations required a full table copy and exclusive lock, blocking all traffic.

InnoDB Online DDL uses two main algorithms:
- **INPLACE** - modifies the table in place without copying all data; allows concurrent DML.
- **COPY** - builds a full copy of the table with the new structure; blocks DML.

MySQL 8 also supports **INSTANT** for certain column additions - a metadata-only change with no table rebuild.

## Controlling the Algorithm

```sql
ALTER TABLE orders
  ADD COLUMN notes TEXT,
  ALGORITHM = INSTANT;

ALTER TABLE orders
  ADD INDEX idx_customer_date (customer_id, order_date),
  ALGORITHM = INPLACE,
  LOCK = NONE;

ALTER TABLE orders
  CHANGE COLUMN status order_status VARCHAR(30),
  ALGORITHM = COPY,
  LOCK = EXCLUSIVE;
```

`LOCK` options:
- `NONE` - allows full concurrent reads and writes.
- `SHARED` - allows concurrent reads, blocks writes.
- `DEFAULT` - MySQL chooses the minimum lock needed.
- `EXCLUSIVE` - full table lock.

## INSTANT Algorithm (MySQL 8.0.12+)

INSTANT modifies only the table metadata without touching row data. It is the fastest option:

```sql
-- Adding a column at the end of the table
ALTER TABLE products
  ADD COLUMN tags JSON,
  ALGORITHM = INSTANT;

-- Adding a column with a default value
ALTER TABLE orders
  ADD COLUMN processed_at TIMESTAMP DEFAULT NULL,
  ALGORITHM = INSTANT;
```

Verify INSTANT is supported by attempting the operation with `ALGORITHM = INSTANT`. MySQL raises an error if INSTANT is not available:

```sql
ALTER TABLE products
  ADD COLUMN new_col INT,
  ALGORITHM = INSTANT;
-- If INSTANT is not supported for this operation, MySQL returns:
-- ERROR 0A000: ALGORITHM=INSTANT is not supported for this operation.
```

## INPLACE Algorithm - How It Works

For an INPLACE rebuild:

1. **Prepare phase** - MySQL acquires a brief metadata lock, captures the current state.
2. **Execute phase** - the index is built or the operation is applied in the background. DML is allowed and concurrent changes are recorded in a temporary online log.
3. **Commit phase** - MySQL replays the logged DML changes and acquires a brief exclusive lock to swap in the new structure.

The exclusive lock at the commit phase is very short (milliseconds for most operations).

## COPY Algorithm - How It Works

For COPY:

1. MySQL creates a new table with the new structure.
2. Copies all rows to the new table (can take hours for large tables).
3. Acquires an exclusive lock and renames the tables.
4. Drops the old table.

During the copy, DML writes are always blocked. With `LOCK = SHARED` (the default for COPY), concurrent reads are permitted. With `LOCK = EXCLUSIVE`, even reads are blocked.

## Checking What Algorithm a DDL Will Use

```sql
-- MySQL will error if the requested algorithm is not available
ALTER TABLE large_table
  ADD COLUMN flag TINYINT DEFAULT 0,
  ALGORITHM = INSTANT;
-- If INSTANT is not available for this operation, MySQL raises an error

-- To check what algorithm MySQL will use, specify ALGORITHM explicitly.
-- MySQL raises an error if the requested algorithm is not supported:
ALTER TABLE large_table MODIFY COLUMN amount DECIMAL(14,2), ALGORITHM = INPLACE;
-- If INPLACE is not available, MySQL returns an error and you must use COPY.
```

## Common Operations and Their Algorithms

| Operation | INSTANT | INPLACE | Rebuild Required |
|-----------|---------|---------|-----------------|
| Add column at end | Yes (8.0.12+) | Yes | No |
| Add column in middle | Yes (8.0.29+) | Yes | Yes |
| Drop column | Yes (8.0.29+) | Yes | Yes |
| Add index (non-primary) | No | Yes | No |
| Modify column definition | No | Sometimes | Sometimes |
| Change column type | No | No | Yes (COPY only) |
| Add primary key | No | Yes | Yes |

## Monitoring Online DDL Progress

For large table rebuilds, monitor progress:

```sql
SELECT
  EVENT_NAME,
  WORK_COMPLETED,
  WORK_ESTIMATED,
  ROUND(WORK_COMPLETED/WORK_ESTIMATED * 100, 1) AS pct_done
FROM performance_schema.events_stages_current
WHERE EVENT_NAME LIKE '%alter%';
```

## Using pt-online-schema-change for Large Tables

For very large tables where even the brief lock at INPLACE commit phase is unacceptable, use `pt-online-schema-change` (Percona Toolkit):

```bash
pt-online-schema-change \
  --alter "ADD INDEX idx_customer (customer_id)" \
  --user=root --password=pass \
  D=myapp,t=orders \
  --execute
```

`pt-osc` creates a shadow table, copies data in chunks, uses triggers to track changes, and does a fast rename at the end - with zero seconds of locking in most cases.

## Summary

MySQL Online DDL enables schema changes with minimal interruption. Use `ALGORITHM=INSTANT` for supported column additions - it is a metadata-only change with zero table rebuild. Use `ALGORITHM=INPLACE, LOCK=NONE` for index changes and most other operations that allow concurrent DML. Reserve `ALGORITHM=COPY` only when required, and for extremely large tables, consider `pt-online-schema-change` to eliminate even the brief commit-phase lock.
