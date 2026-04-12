# What Is the COPY Algorithm for ALTER TABLE in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, ALTER TABLE, DDL, COPY Algorithm, Schema Change

Description: The COPY algorithm for ALTER TABLE in MySQL rebuilds a table by copying all rows to a new table structure, blocking writes for the duration of the operation.

---

## Overview

When you run an `ALTER TABLE` statement in MySQL, the server uses one of several algorithms to apply the schema change: `INSTANT`, `INPLACE`, or `COPY`. The `COPY` algorithm is the oldest and most straightforward approach. It creates a new table with the target structure, copies all existing rows into it, and then replaces the original table with the new one.

Because the COPY algorithm requires rewriting every row in the table, it is the slowest option. It also holds a metadata lock that blocks writes (but typically allows reads) during the operation.

## How the COPY Algorithm Works

1. Create a new empty table with the new structure
2. Copy all rows from the original table to the new table
3. Replace the original table with the new one
4. Drop the original table

Unlike the INPLACE algorithm, which maintains a log of concurrent DML changes and applies them after the rebuild, the COPY algorithm does not allow concurrent DML. Writes are blocked for the full duration.

## Forcing the COPY Algorithm

```sql
ALTER TABLE orders
ADD COLUMN notes TEXT,
ALGORITHM = COPY;
```

You can also combine it with a lock hint:

```sql
ALTER TABLE orders
ADD COLUMN notes TEXT,
ALGORITHM = COPY,
LOCK = SHARED;
```

`LOCK = SHARED` allows reads but blocks writes. `LOCK = EXCLUSIVE` blocks both reads and writes.

## When MySQL Uses COPY

MySQL falls back to COPY when:

- The operation is not supported by INSTANT or INPLACE
- You explicitly specify `ALGORITHM = COPY`
- An older MySQL version is used that does not support Online DDL for the operation

Examples of operations that require COPY (in some configurations):

```sql
-- Changing a column data type incompatibly
ALTER TABLE users MODIFY COLUMN age TINYINT, ALGORITHM = COPY;

-- Converting character sets on large tables
ALTER TABLE posts CONVERT TO CHARACTER SET utf8mb4, ALGORITHM = COPY;
```

## Checking Which Algorithm Will Be Used

`EXPLAIN` is not available for DDL statements, but you can test with `ALGORITHM = INSTANT` and if it fails, try `INPLACE`, then fall back to understanding COPY is required.

Alternatively, check the MySQL documentation for the specific operation, or observe behavior:

```sql
-- Try INSTANT first
ALTER TABLE mytable ADD COLUMN flag TINYINT DEFAULT 0, ALGORITHM = INSTANT;

-- If that fails, try INPLACE
ALTER TABLE mytable ADD COLUMN flag TINYINT DEFAULT 0, ALGORITHM = INPLACE;

-- COPY is always the last resort
ALTER TABLE mytable ADD COLUMN flag TINYINT DEFAULT 0, ALGORITHM = COPY;
```

## Monitoring a COPY Operation

During a long COPY operation, monitor progress using `information_schema.INNODB_TRX` or Performance Schema:

```sql
SELECT trx_id, trx_state, trx_started, trx_query
FROM information_schema.INNODB_TRX
WHERE trx_query LIKE 'ALTER%';
```

For large tables, consider using tools like `pt-online-schema-change` or `gh-ost` to perform COPY-style changes with less locking impact.

## COPY vs INPLACE vs INSTANT

| Algorithm | Speed | Concurrent Writes | Row Copy |
|---|---|---|---|
| INSTANT | Immediate | Yes | No |
| INPLACE | Fast | Yes (for supported ops) | Sometimes |
| COPY | Slow | No (writes blocked) | Always |

## Summary

The COPY algorithm for `ALTER TABLE` is MySQL's fallback method for schema changes that cannot be handled by INSTANT or INPLACE. It rewrites the entire table, which guarantees correctness for any change type but blocks writes and consumes significant I/O on large tables. For production environments with large tables, plan COPY-based alterations during maintenance windows or use online schema change tools to minimize disruption.