# How to Use RENAME TABLE in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, SQL, DDL, RENAME TABLE

Description: Learn how to rename tables in ClickHouse using RENAME TABLE, including cross-database moves, multiple renames in one statement, and the atomic swap pattern.

---

Renaming a table is one of the safest schema changes you can make in ClickHouse because it only updates metadata - no data is copied or moved on disk. This makes RENAME TABLE extremely fast even on tables with hundreds of gigabytes of data. This post covers the syntax, multi-table renames, cross-database moves, and the classic atomic swap pattern used in zero-downtime data refreshes.

## Basic RENAME TABLE Syntax

```sql
RENAME TABLE old_table_name TO new_table_name;
```

With a database qualifier:

```sql
RENAME TABLE analytics.events_old TO analytics.events;
```

The operation is atomic at the metadata level. Any query that completes the metadata read after the rename will see the new name; any query already executing against the old name will finish normally.

## Moving a Table to a Different Database

You can move a table to another database in the same RENAME TABLE statement by changing the database prefix:

```sql
-- Move events from staging to analytics
RENAME TABLE staging.events TO analytics.events;
```

The target database must already exist. No data files are relocated - only the table's entry in the metadata catalog changes.

## Renaming Multiple Tables in One Statement

ClickHouse allows a comma-separated list of renames in a single RENAME TABLE:

```sql
RENAME TABLE
    analytics.events_v1 TO analytics.events_archived,
    analytics.events_v2 TO analytics.events;
```

Note that multi-table renames in one statement are **not atomic**. The operation may be partially executed, and other sessions may briefly see a state where one rename has completed but the other has not. If you need a truly atomic swap of two tables, use the EXCHANGE TABLES statement instead (covered below).

## Atomic Swap Pattern

A common pattern is the "cut-over" swap: you build a new version of a table under a temporary name, then swap it into production.

```sql
-- Step 1: build fresh data in a shadow table
CREATE TABLE analytics.events_new AS analytics.events;

INSERT INTO analytics.events_new
SELECT * FROM raw.events_raw;

-- Step 2: atomically swap the old and new tables
EXCHANGE TABLES analytics.events AND analytics.events_new;

-- Step 3: drop the old data once satisfied
DROP TABLE IF EXISTS analytics.events_new;
```

EXCHANGE TABLES swaps two existing tables in a single atomic operation, so there is no window where a query would fail to find the production table. Note that EXCHANGE TABLES requires the Atomic database engine (the default since ClickHouse 20.5).

If you are not using the Atomic database engine, you can approximate the swap with a multi-table RENAME, but be aware that this is not atomic and other sessions may briefly encounter a missing table:

```sql
RENAME TABLE
    analytics.events     TO analytics.events_backup,
    analytics.events_new TO analytics.events;
```

## ON CLUSTER

To rename across a distributed cluster:

```sql
RENAME TABLE analytics.events_old TO analytics.events ON CLUSTER my_cluster;
```

All nodes in the cluster rename the table simultaneously. Replicated tables replicate the metadata change automatically, but the ON CLUSTER clause ensures Distributed table entries on every shard are also updated.

## Practical Example

```sql
-- Rename a staging table to production after validation
RENAME TABLE staging.user_events TO analytics.user_events;

-- Verify
EXISTS TABLE staging.user_events;   -- 0
EXISTS TABLE analytics.user_events; -- 1
```

## Summary

RENAME TABLE in ClickHouse is a metadata operation that completes instantly regardless of table size. Multi-table renames in a single statement are convenient but not atomic — for truly atomic swaps, use EXCHANGE TABLES. Use a cross-database rename to move a table between schemas without touching data on disk.
