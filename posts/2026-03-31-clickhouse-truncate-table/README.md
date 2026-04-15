# How to Use TRUNCATE TABLE in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, SQL, DDL, TRUNCATE, Data Management

Description: Learn how to remove all rows from a ClickHouse table using TRUNCATE TABLE, including ON CLUSTER, partition-level truncation, and key differences from DROP TABLE.

---

When you need to clear all data from a table without removing the table structure itself, TRUNCATE TABLE is the right tool. Unlike DELETE, which generates a mutation and marks rows, TRUNCATE drops all data parts immediately and is far more efficient. This post covers the full TRUNCATE TABLE syntax in ClickHouse, including cluster-wide truncation and partition-scoped alternatives.

## Basic TRUNCATE TABLE Syntax

The simplest form removes every row from a table and reclaims disk space immediately.

```sql
TRUNCATE TABLE events;
```

You can also qualify with a database name:

```sql
TRUNCATE TABLE analytics.events;
```

The table itself is preserved along with its schema, indexes, and settings. Only the data is removed.

### IF EXISTS Variant

To avoid an error when the table might not exist, use IF EXISTS:

```sql
TRUNCATE TABLE IF EXISTS analytics.events;
```

This is useful in deployment scripts and teardown routines where you want idempotent behavior.

## TRUNCATE TABLE ON CLUSTER

In a distributed ClickHouse cluster, you may need to truncate a table across all nodes. For ReplicatedMergeTree tables, truncating on one replica is automatically propagated to other replicas through the replication log. For non-replicated engines or Distributed tables, add the ON CLUSTER clause to execute the truncation on every node:

```sql
TRUNCATE TABLE analytics.events ON CLUSTER '{cluster}';
```

Replace `'{cluster}'` with the actual cluster name defined in your `config.xml`, for example:

```sql
TRUNCATE TABLE analytics.events ON CLUSTER my_cluster;
```

ClickHouse will execute the DDL on every shard and replica in the cluster. Since ReplicatedMergeTree tables replicate truncation automatically, ON CLUSTER is primarily needed for Distributed or non-replicated engine setups. By default, truncation on replicated tables happens asynchronously — add the `SYNC` keyword to wait for all replicas to complete the operation:

```sql
TRUNCATE TABLE analytics.events SYNC;
```

## Truncating a Specific Partition

If you do not want to remove all data - only a specific time window or partition value - use ALTER TABLE ... DROP PARTITION instead of a full TRUNCATE:

```sql
-- Drop a single partition (e.g., the month 2026-02)
ALTER TABLE analytics.events DROP PARTITION '2026-02';

-- Drop multiple partitions
ALTER TABLE analytics.events DROP PARTITION '2026-01';
ALTER TABLE analytics.events DROP PARTITION '2026-02';
```

This is more targeted than TRUNCATE and is the preferred approach when you want to expire old data without touching recent partitions.

## TRUNCATE vs DROP TABLE

| Operation | Removes schema | Removes data | Recoverable |
|-----------|---------------|--------------|-------------|
| TRUNCATE TABLE | No | Yes | No |
| DROP TABLE | Yes | Yes | No |
| ALTER TABLE DROP PARTITION | No | Partial | No |

TRUNCATE TABLE is the right choice when you want to reuse the table definition but start with a clean slate - for example, resetting a staging table before a new load cycle.

## Practical Example

```sql
-- Step 1: create a staging table
CREATE TABLE staging.events_staging
(
    event_id  UUID,
    event_type String,
    user_id   UInt64,
    created_at DateTime
)
ENGINE = MergeTree()
ORDER BY (event_type, created_at);

-- Step 2: load data into staging
INSERT INTO staging.events_staging
SELECT * FROM raw.events_raw WHERE created_at >= today();

-- Step 3: reset staging for the next run
TRUNCATE TABLE staging.events_staging;
```

### Verifying the Table Is Empty

```sql
SELECT count() FROM staging.events_staging;
-- Returns 0 after TRUNCATE
```

## Summary

TRUNCATE TABLE in ClickHouse removes all rows instantly and is far more efficient than DELETE for full-table clears because it drops data parts rather than generating a mutation. Use ON CLUSTER to propagate to all nodes, and prefer ALTER TABLE DROP PARTITION when you only need to remove a specific date range or partition value.
