# How to Use DROP TABLE and DROP DATABASE in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, SQL, DDL, DROP TABLE, DROP DATABASE

Description: Learn how to permanently remove tables and databases in ClickHouse using DROP TABLE and DROP DATABASE, including IF EXISTS, ON CLUSTER, and the SYNC option.

---

Removing tables and databases is a routine part of schema lifecycle management. In ClickHouse, DROP TABLE and DROP DATABASE are the DDL statements that handle permanent deletion. Because these operations are irreversible by default, ClickHouse provides safety modifiers like IF EXISTS and SYNC that give you control over error handling and timing. This post covers every variant you are likely to need.

## DROP TABLE

The basic syntax removes a single table and all of its data parts from disk.

```sql
DROP TABLE analytics.events;
```

If the database qualifier is omitted, ClickHouse uses the current database for the session.

```sql
USE analytics;
DROP TABLE events;
```

### IF EXISTS

When a table may or may not exist - common in migration scripts - add IF EXISTS to suppress the error:

```sql
DROP TABLE IF EXISTS analytics.events;
```

Without IF EXISTS, dropping a non-existent table raises an error and aborts the script.

### ON CLUSTER

To drop a table across every node in a named cluster in one statement, use ON CLUSTER:

```sql
DROP TABLE IF EXISTS analytics.events ON CLUSTER my_cluster;
```

ClickHouse sends the DDL to each node in the cluster and drops the table on every one. For ReplicatedMergeTree tables, a plain DROP TABLE only removes the local replica on the node where it runs - the other replicas remain intact. ON CLUSTER is how you tear the table down on every shard and replica in a single statement.

### SYNC Option

By default, DROP TABLE in ClickHouse schedules the removal asynchronously. The SYNC modifier forces the operation to block until the data is fully deleted from disk before returning:

```sql
DROP TABLE analytics.events SYNC;
```

Use SYNC in test teardown or CI pipelines where a subsequent CREATE TABLE with the same name must not race with the background cleanup.

## DROP DATABASE

DROP DATABASE removes the database and every table inside it.

```sql
DROP DATABASE analytics;
```

### IF EXISTS

```sql
DROP DATABASE IF EXISTS analytics;
```

### ON CLUSTER

```sql
DROP DATABASE IF EXISTS analytics ON CLUSTER my_cluster;
```

This removes the database from every node in the cluster simultaneously.

## Practical Example - Dropping a Shadow Schema

A common pattern is maintaining a shadow database for a blue-green refresh cycle. After the swap, the old database is dropped:

```sql
-- Promote the shadow database by swapping names, then drop the old one
RENAME TABLE analytics.events    TO analytics_old.events;
RENAME TABLE analytics_new.events TO analytics.events;

-- Now clean up the old database
DROP TABLE IF EXISTS analytics_old.events SYNC;
DROP DATABASE IF EXISTS analytics_old;
```

### Verifying a Table Is Gone

```sql
EXISTS TABLE analytics.events;
-- Returns 0 if the table no longer exists
```

## DROP vs TRUNCATE

| Operation | Schema removed | Data removed | Use case |
|-----------|---------------|--------------|---------|
| DROP TABLE | Yes | Yes | Permanent removal |
| TRUNCATE TABLE | No | Yes | Reset data, keep schema |

## Summary

DROP TABLE and DROP DATABASE in ClickHouse permanently remove schema and data with no built-in undo. Use IF EXISTS for idempotent scripts, ON CLUSTER to propagate to all nodes in a distributed setup, and SYNC when you need the deletion to complete before the next statement executes.
