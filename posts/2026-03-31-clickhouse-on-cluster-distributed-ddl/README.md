# How to Use ON CLUSTER Clause for Distributed DDL in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Cluster, DDL, Distributed System, Database

Description: Learn how to use the ON CLUSTER clause to run DDL statements across all nodes in a ClickHouse cluster simultaneously, including error handling and best practices.

Running DDL statements manually on every node in a ClickHouse cluster is error-prone and slow. The `ON CLUSTER` clause solves this: you run a DDL statement on one node and ClickHouse automatically distributes it to every node in the cluster through ZooKeeper. This guide covers everything you need to know to use it correctly.

## How ON CLUSTER Works

When you append `ON CLUSTER cluster_name` to a DDL statement, the node you are connected to becomes the coordinator. It writes the DDL task to a ZooKeeper path (`/clickhouse/task_queue/ddl` by default). Every other node in the cluster watches this path and executes the task when it appears. The coordinator waits for all nodes to report success or failure.

Configure the DDL task queue in `config.d/distributed_ddl.xml`:

```xml
<clickhouse>
    <distributed_ddl>
        <!-- ZooKeeper path for DDL task queue -->
        <path>/clickhouse/task_queue/ddl</path>

        <!-- How long to keep completed tasks before cleanup -->
        <task_max_lifetime>604800</task_max_lifetime>

        <!-- Cleanup interval in seconds -->
        <cleanup_delay_period>60</cleanup_delay_period>

        <!-- Max tasks to keep in history -->
        <max_tasks_in_queue>1000</max_tasks_in_queue>
    </distributed_ddl>
</clickhouse>
```

## Creating Tables with ON CLUSTER

The most common use case is creating a replicated table across all nodes at once:

```sql
-- Create the replicated local table on all nodes
CREATE TABLE IF NOT EXISTS events ON CLUSTER production_cluster
(
    event_date   Date,
    event_time   DateTime,
    user_id      UInt64,
    event_type   LowCardinality(String),
    properties   String
)
ENGINE = ReplicatedMergeTree(
    '/clickhouse/tables/{shard}/events',
    '{replica}'
)
PARTITION BY toYYYYMM(event_date)
ORDER BY (event_type, event_date, user_id)
SETTINGS index_granularity = 8192;
```

```sql
-- Create the distributed table on all nodes
-- This is the table applications connect to for reads and writes
CREATE TABLE IF NOT EXISTS events_all ON CLUSTER production_cluster
AS events
ENGINE = Distributed(
    production_cluster,
    currentDatabase(),
    events,
    cityHash64(user_id)
);
```

## Altering Tables with ON CLUSTER

Schema changes can be applied to all nodes in one statement:

```sql
-- Add a column to all nodes
ALTER TABLE events ON CLUSTER production_cluster
    ADD COLUMN IF NOT EXISTS session_id String AFTER user_id;

-- Add multiple columns at once
ALTER TABLE events ON CLUSTER production_cluster
    ADD COLUMN IF NOT EXISTS browser    LowCardinality(String),
    ADD COLUMN IF NOT EXISTS os         LowCardinality(String),
    ADD COLUMN IF NOT EXISTS ip_address IPv4;

-- Change a column type
ALTER TABLE events ON CLUSTER production_cluster
    MODIFY COLUMN properties JSON;

-- Drop a column
ALTER TABLE events ON CLUSTER production_cluster
    DROP COLUMN IF EXISTS old_column;
```

For replicated tables, you can run `ALTER` on just one node and replication will propagate the change. But for non-replicated tables or `Distributed` tables, you need `ON CLUSTER`.

## Dropping and Truncating with ON CLUSTER

```sql
-- Truncate all data from a table on all nodes
TRUNCATE TABLE events ON CLUSTER production_cluster;

-- Drop a table from all nodes
DROP TABLE IF EXISTS events ON CLUSTER production_cluster;

-- Drop a view from all nodes
DROP VIEW IF EXISTS events_daily_summary ON CLUSTER production_cluster;

-- Drop a database from all nodes
DROP DATABASE IF EXISTS staging ON CLUSTER production_cluster;
```

## Creating Databases with ON CLUSTER

```sql
-- Create a database on all nodes
CREATE DATABASE IF NOT EXISTS analytics ON CLUSTER production_cluster;
```

## Monitoring DDL Task Execution

DDL tasks are tracked in `system.distributed_ddl_queue`:

```sql
-- Check the status of recent DDL tasks
SELECT
    entry,
    query,
    initiator_host,
    initiator_port,
    cluster,
    status,
    exception_code,
    exception_text,
    query_create_time,
    query_finish_time
FROM system.distributed_ddl_queue
ORDER BY query_create_time DESC
LIMIT 20;
```

If a DDL task is pending (status = `Active`), it means one or more nodes have not yet executed it. Common reasons:

- The node is offline
- ZooKeeper is unreachable from the node
- The node is running a different ClickHouse version that does not support the syntax

```sql
-- Find nodes that have not completed a DDL task
SELECT
    entry,
    host,
    port,
    status,
    exception_text
FROM system.distributed_ddl_queue
WHERE status != 'Finished'
ORDER BY query_create_time DESC;
```

## Handling Failures

By default, `ON CLUSTER` waits up to `distributed_ddl_task_timeout` (default 180 seconds) for all nodes to complete. If any node fails or the timeout is exceeded, an exception is thrown. The DDL task remains in ZooKeeper, so offline nodes will execute it when they come back online.

To increase the wait time for large clusters or slow operations:

```sql
-- Increase the timeout (default is 180 seconds)
SET distributed_ddl_task_timeout = 300;  -- 300 seconds

-- If any node fails within the timeout, the statement throws an error
CREATE TABLE events ON CLUSTER production_cluster ...;
```

To run DDL asynchronously (useful during rolling upgrades):

```sql
-- Async mode: return immediately without waiting for nodes
SET distributed_ddl_task_timeout = 0;

-- The DDL is queued in ZooKeeper and nodes execute it in the background
CREATE TABLE events ON CLUSTER production_cluster ...;
```

## Using ON CLUSTER with IF NOT EXISTS and IF EXISTS

Always use `IF NOT EXISTS` for `CREATE` and `IF EXISTS` for `DROP` in `ON CLUSTER` statements. This makes the statement idempotent and safe to re-run if it was partially applied:

```sql
-- Safe to run multiple times
CREATE TABLE IF NOT EXISTS events ON CLUSTER production_cluster (...);
DROP TABLE IF EXISTS events ON CLUSTER production_cluster;
ALTER TABLE events ON CLUSTER production_cluster
    ADD COLUMN IF NOT EXISTS new_col String;
```

## Renaming Tables Across the Cluster

```sql
-- Rename a table on all nodes
RENAME TABLE events TO events_v2 ON CLUSTER production_cluster;

-- Swap two tables atomically on all nodes (requires Atomic database engine)
EXCHANGE TABLES events AND events_v2 ON CLUSTER production_cluster;
```

`EXCHANGE TABLES` is useful for zero-downtime schema changes: build the new table in parallel, then swap it with the old one atomically. This statement requires the Atomic database engine (the default since ClickHouse 21.12).

## Best Practices

**Always use macros in the engine path**: Using `{shard}` and `{replica}` macros means your DDL is identical on every node. Without macros, you would need to run different DDL on each node.

**Use a consistent cluster name**: Define one cluster name in config and use it everywhere. If you create tables with inconsistent cluster names, `ON CLUSTER` may not reach all nodes.

**Do not mix ON CLUSTER with manual per-node DDL**: Choose one approach and stick to it. Mixing them leads to nodes with different schemas.

**Check the DDL queue after running large migrations**: Confirm all nodes finished before proceeding:

```sql
SELECT
    host,
    status,
    exception_text
FROM system.distributed_ddl_queue
WHERE entry = (
    SELECT max(entry)
    FROM system.distributed_ddl_queue
);
```
