# How to Use Online DDL in MySQL (ALTER TABLE ALGORITHM)

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, DDL, InnoDB, Performance, Schema

Description: Learn how MySQL Online DDL works, how to choose between INSTANT, INPLACE, and COPY algorithms, and how to run schema changes without locking production tables.

---

## What Is Online DDL?

MySQL InnoDB supports Online DDL, which allows many `ALTER TABLE` operations to proceed without fully blocking reads or writes. You control the behavior using two clauses: `ALGORITHM` and `LOCK`.

```sql
ALTER TABLE orders
    ADD COLUMN notes TEXT NULL,
    ALGORITHM = INPLACE,
    LOCK = NONE;
```

## The Three Algorithms

### INSTANT (MySQL 8.0+)

`INSTANT` is the fastest algorithm. It modifies only the data dictionary - no table rebuild occurs and no rows are touched. The change takes effect in milliseconds regardless of table size.

```sql
ALTER TABLE orders
    ADD COLUMN priority TINYINT NOT NULL DEFAULT 0,
    ALGORITHM = INSTANT;
```

Supported operations include adding columns at the end of a table, changing column default values, and modifying ENUM/SET values.

### INPLACE

`INPLACE` performs the operation inside InnoDB without making a temporary copy of the table. For many operations, it allows concurrent DML (`LOCK=NONE`).

```sql
ALTER TABLE orders
    ADD INDEX idx_status (status),
    ALGORITHM = INPLACE,
    LOCK = NONE;
```

### COPY

`COPY` creates a full temporary copy of the table, applies the change, then swaps it in. This blocks concurrent writes and is the slowest algorithm.

```sql
ALTER TABLE orders
    MODIFY COLUMN status VARCHAR(30) NOT NULL,
    ALGORITHM = COPY,
    LOCK = SHARED;
```

## LOCK Options

| Option | Behavior |
|--------|----------|
| NONE | Allows concurrent reads and writes |
| SHARED | Allows concurrent reads but blocks writes |
| DEFAULT | MySQL chooses the least restrictive lock supported |
| EXCLUSIVE | Blocks all concurrent access |

## Checking Which Algorithm Will Be Used

Specify `ALGORITHM=INSTANT` in your statement. If the operation does not support that algorithm, MySQL raises an error immediately without making any changes. If it does support INSTANT, the statement executes and the change is applied. There is no dry-run mode - test on a non-production table first if you are unsure.

```sql
-- This will execute if INSTANT is supported, or fail with an error if not
ALTER TABLE orders
    ADD COLUMN tracking_number VARCHAR(100) NULL,
    ALGORITHM = INSTANT;
```

## Monitoring an In-Progress Online DDL

```sql
SELECT EVENT_NAME, WORK_COMPLETED, WORK_ESTIMATED
FROM performance_schema.events_stages_current
WHERE EVENT_NAME LIKE '%alter%';
```

## Operations Supporting INSTANT in MySQL 8.0

```sql
-- Add column at end of table
ALTER TABLE t ADD COLUMN c1 INT DEFAULT 0, ALGORITHM=INSTANT;

-- Drop column default
ALTER TABLE t ALTER COLUMN c1 DROP DEFAULT, ALGORITHM=INSTANT;

-- Add/drop virtual generated column
ALTER TABLE t ADD COLUMN vc INT AS (a + b) VIRTUAL, ALGORITHM=INSTANT;
```

## Practical Recommendation

Always specify both `ALGORITHM` and `LOCK` explicitly when altering large production tables. Start with `ALGORITHM=INSTANT`, fall back to `INPLACE, LOCK=NONE`, and only use `COPY` when no other option is available.

## Summary

MySQL Online DDL provides three algorithms - INSTANT, INPLACE, and COPY - with increasing levels of disruption. Use `ALGORITHM=INSTANT` for supported column additions, `ALGORITHM=INPLACE, LOCK=NONE` for index operations, and monitor progress through `performance_schema.events_stages_current` for long-running changes.
