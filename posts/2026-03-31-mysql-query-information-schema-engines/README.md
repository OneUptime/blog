# How to Query INFORMATION_SCHEMA.ENGINES in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, INFORMATION_SCHEMA, Storage Engine, InnoDB, Database Administration

Description: Learn how to query INFORMATION_SCHEMA.ENGINES in MySQL to list available storage engines, their support status, and capabilities like transactions and XA.

---

## What Is INFORMATION_SCHEMA.ENGINES?

The `INFORMATION_SCHEMA.ENGINES` table provides metadata about storage engines available on the MySQL server. Each row represents one engine and includes information about whether the engine is supported, whether it handles transactions, savepoints, and distributed (XA) transactions.

This view is equivalent to running `SHOW ENGINES` but is more scriptable and integrates seamlessly with other `INFORMATION_SCHEMA` queries.

## Columns in ENGINES

- `ENGINE` - the storage engine name (e.g., `InnoDB`, `MyISAM`, `MEMORY`)
- `SUPPORT` - `DEFAULT`, `YES`, `NO`, or `DISABLED`
- `COMMENT` - brief description of the engine
- `TRANSACTIONS` - `YES` if the engine supports transactions
- `XA` - `YES` if the engine supports XA (distributed) transactions
- `SAVEPOINTS` - `YES` if the engine supports savepoints

## List All Available Engines

```sql
SELECT
    ENGINE,
    SUPPORT,
    TRANSACTIONS,
    XA,
    SAVEPOINTS
FROM INFORMATION_SCHEMA.ENGINES
ORDER BY ENGINE;
```

## Find the Default Storage Engine

```sql
SELECT ENGINE, COMMENT
FROM INFORMATION_SCHEMA.ENGINES
WHERE SUPPORT = 'DEFAULT';
```

On modern MySQL installations, this returns `InnoDB`.

## Find All Engines That Support Transactions

```sql
SELECT ENGINE, SUPPORT, XA, SAVEPOINTS
FROM INFORMATION_SCHEMA.ENGINES
WHERE TRANSACTIONS = 'YES'
  AND SUPPORT IN ('DEFAULT', 'YES');
```

## Check if a Specific Engine Is Available

Before creating a table with a non-default engine, confirm it is available:

```sql
SELECT ENGINE, SUPPORT
FROM INFORMATION_SCHEMA.ENGINES
WHERE ENGINE = 'MEMORY';
```

If `SUPPORT` is `NO` or `DISABLED`, you cannot use that engine.

## Common Storage Engines and Their Use Cases

Here is a practical reference:

```text
InnoDB    - Default engine; ACID transactions, foreign keys, row-level locking
MyISAM    - Legacy engine; no transactions; faster for read-heavy workloads
MEMORY    - Stores data in RAM; extremely fast; data lost on restart
ARCHIVE   - Compressed storage; only INSERT and SELECT; indexes only on AUTO_INCREMENT columns
CSV       - Stores data as CSV files; useful for data exchange
BLACKHOLE - Accepts writes but discards them; useful for replication filtering
```

## Detect Disabled Engines

```sql
SELECT ENGINE, SUPPORT
FROM INFORMATION_SCHEMA.ENGINES
WHERE SUPPORT = 'DISABLED';
```

## Switch Default Engine at Runtime (Session Level)

```sql
SET default_storage_engine = MyISAM;
```

Verify the change using the engines table or:

```sql
SHOW VARIABLES LIKE 'default_storage_engine';
```

## InnoDB vs MyISAM Quick Comparison

To confirm transaction support differences:

```sql
SELECT ENGINE, TRANSACTIONS, SAVEPOINTS
FROM INFORMATION_SCHEMA.ENGINES
WHERE ENGINE IN ('InnoDB', 'MyISAM', 'MEMORY');
```

## Summary

`INFORMATION_SCHEMA.ENGINES` is a quick way to discover which storage engines are active on your MySQL server and what capabilities each one provides. Always verify engine availability before using non-default engines in table DDL, and prefer `InnoDB` for any production workloads that require data durability and transactional integrity.
