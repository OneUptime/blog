# How to Use ON CLUSTER Clause in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, ON CLUSTER, Distributed DDL, Cluster, Administration

Description: Learn how to use the ON CLUSTER clause in ClickHouse to execute DDL operations across all nodes simultaneously from a single connection.

---

The `ON CLUSTER` clause in ClickHouse propagates DDL statements to all nodes in a named cluster without requiring you to connect to each node individually. It relies on the distributed DDL task queue in ZooKeeper or ClickHouse Keeper.

## Basic Syntax

Append `ON CLUSTER cluster_name` to any supported DDL statement:

```sql
CREATE TABLE my_table ON CLUSTER my_cluster (...);
DROP TABLE my_table ON CLUSTER my_cluster;
ALTER TABLE my_table ON CLUSTER my_cluster ADD COLUMN new_col String;
TRUNCATE TABLE my_table ON CLUSTER my_cluster;
```

The cluster name must match a cluster defined in your `remote_servers` configuration.

## Creating Replicated Tables with ON CLUSTER

The most common use is creating ReplicatedMergeTree tables across all shards and replicas:

```sql
CREATE TABLE metrics_local ON CLUSTER production
(
    ts DateTime,
    host LowCardinality(String),
    metric_name LowCardinality(String),
    value Float64
)
ENGINE = ReplicatedMergeTree(
    '/clickhouse/tables/{shard}/metrics_local',
    '{replica}'
)
PARTITION BY toYYYYMM(ts)
ORDER BY (host, metric_name, ts);
```

The `{shard}` and `{replica}` macros are substituted per-node using the values in `macros.xml`.

## Creating a Distributed Table with ON CLUSTER

After creating local tables, create the Distributed table on all nodes:

```sql
CREATE TABLE metrics ON CLUSTER production
AS metrics_local
ENGINE = Distributed(production, default, metrics_local, cityHash64(host));
```

## Adding Columns Across the Cluster

Schema evolution with `ALTER TABLE ... ON CLUSTER`:

```sql
-- Add a column to all nodes
ALTER TABLE metrics_local ON CLUSTER production
ADD COLUMN region LowCardinality(String) DEFAULT '';

-- Rename a column (ClickHouse 20.4+)
ALTER TABLE metrics_local ON CLUSTER production
RENAME COLUMN region TO datacenter;
```

## Dropping Tables Safely

Always drop the Distributed table before the local table to avoid dangling references:

```sql
DROP TABLE IF EXISTS metrics ON CLUSTER production;
DROP TABLE IF EXISTS metrics_local ON CLUSTER production;
```

## Checking Which Clusters Are Available

```sql
SELECT
    cluster,
    shard_num,
    replica_num,
    host_name,
    port,
    is_local
FROM system.clusters
WHERE cluster = 'production'
ORDER BY shard_num, replica_num;
```

## Handling Partial Failures

If some nodes are down when you run `ON CLUSTER`, the query returns results per-host showing success or failure:

```sql
-- Output shows status for each host
ALTER TABLE metrics_local ON CLUSTER production
MODIFY COLUMN value Float32;
```

Nodes that were down will execute the DDL when they restart via the ZooKeeper task queue.

## Setting a Timeout

For large clusters where DDL may take longer:

```sql
SET distributed_ddl_task_timeout = 600;  -- 10 minutes

CREATE TABLE large_table ON CLUSTER production
AS source_table
ENGINE = ReplicatedMergeTree(...)
PARTITION BY toYYYYMM(ts)
ORDER BY ts;
```

## Summary

The `ON CLUSTER` clause is the primary mechanism for managing schema changes across a ClickHouse cluster. Always use it for `CREATE`, `ALTER`, and `DROP` operations to keep all nodes consistent. Pair it with the `{shard}` and `{replica}` macros for ReplicatedMergeTree ZooKeeper paths, and monitor the distributed DDL queue for nodes that may have missed tasks during downtime.
