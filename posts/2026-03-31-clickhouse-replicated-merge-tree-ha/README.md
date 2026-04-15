# How to Use ReplicatedMergeTree for High Availability in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, ReplicatedMergeTree, High Availability, Replication, Database

Description: Understand how ReplicatedMergeTree works in ClickHouse, how to configure it correctly for HA, and how to avoid common pitfalls that cause split-brain or data loss.

`ReplicatedMergeTree` is ClickHouse's built-in engine for keeping identical copies of data on multiple servers. It uses ZooKeeper (or ClickHouse Keeper) as a coordination service to track which data parts each replica holds, schedule merges, and handle replica recovery. Understanding how it works under the hood lets you configure it correctly and troubleshoot failures quickly.

## How ReplicatedMergeTree Works

When you insert data into a `ReplicatedMergeTree` table, ClickHouse does the following:

1. Writes the data as a new part to the local disk
2. Registers the part in ZooKeeper under the table's ZooKeeper path
3. Other replicas detect the new entry in ZooKeeper and pull the part from the replica that wrote it
4. Each replica independently runs merges, but coordinates with ZooKeeper so that all replicas run the same merges and produce identical part layouts

This design means a replica that was offline for a while can catch up by pulling missing parts from a peer. No data is lost as long as at least one replica has the part.

## Table Engine Syntax

The full syntax for `ReplicatedMergeTree` is:

```sql
ENGINE = ReplicatedMergeTree(
    'zookeeper_path',
    'replica_name'
)
```

Always use macros in production so you do not have to write separate DDL for each node:

```sql
CREATE TABLE orders
(
    order_id    UInt64,
    customer_id UInt64,
    order_date  Date,
    total       Decimal(18, 2),
    status      LowCardinality(String)
)
ENGINE = ReplicatedMergeTree(
    '/clickhouse/tables/{shard}/orders',
    '{replica}'
)
PARTITION BY toYYYYMM(order_date)
ORDER BY (order_date, customer_id, order_id)
SETTINGS
    min_replicated_logs_to_keep = 10,
    max_replicated_logs_to_keep = 1000,
    replicated_deduplication_window = 1000;
```

The `replicated_deduplication_window` setting keeps a checksum of the last 1000 inserts in ZooKeeper. Duplicate inserts with the same data are silently ignored, which makes inserts idempotent. This is the key mechanism for at-least-once delivery guarantees.

## All ReplicatedMergeTree Variants

Every `MergeTree` variant has a replicated counterpart:

```sql
-- Standard replicated table
ENGINE = ReplicatedMergeTree(path, replica)

-- Replicated with aggregated data (used for materialized views)
ENGINE = ReplicatedAggregatingMergeTree(path, replica)

-- Replicated with row replacement by sorting key during merges
ENGINE = ReplicatedReplacingMergeTree(path, replica)
ENGINE = ReplicatedReplacingMergeTree(path, replica, version_column)

-- Replicated with row collapsing (for update patterns)
ENGINE = ReplicatedCollapsingMergeTree(path, replica, sign_column)
ENGINE = ReplicatedVersionedCollapsingMergeTree(path, replica, sign_column, version_column)

-- Replicated with sum aggregation
ENGINE = ReplicatedSummingMergeTree(path, replica)
ENGINE = ReplicatedSummingMergeTree(path, replica, [columns_to_sum])

-- Replicated with Graphite data rollup
ENGINE = ReplicatedGraphiteMergeTree(path, replica, 'graphite_rollup_config')
```

## Configuring Replication Settings

Tune these settings in `config.d/merge_tree.xml` or per-table in the `SETTINGS` clause:

```xml
<clickhouse>
    <merge_tree>
        <!-- How many log entries to keep in ZooKeeper minimum -->
        <min_replicated_logs_to_keep>10</min_replicated_logs_to_keep>

        <!-- How many log entries to keep in ZooKeeper maximum -->
        <max_replicated_logs_to_keep>1000</max_replicated_logs_to_keep>

        <!-- How long to wait for other replicas to confirm a part -->
        <replication_queue_max_wait_ms>15000</replication_queue_max_wait_ms>

        <!-- Maximum network bandwidth for replication fetches in bytes per second (0 = unlimited) -->
        <max_replicated_fetches_network_bandwidth>0</max_replicated_fetches_network_bandwidth>

        <!-- Retry delay for replication operations -->
        <retry_period_ms>5000</retry_period_ms>
    </merge_tree>
</clickhouse>
```

## Read and Write Quorum

For stronger consistency guarantees, configure write and read quorums:

```sql
-- Require 2 replicas to confirm a write before returning success
SET insert_quorum = 2;
SET insert_quorum_timeout = 60000;  -- 60 seconds

-- Require reads to return only data confirmed by a quorum
SET select_sequential_consistency = 1;

-- Now inserts will wait for both replicas to acknowledge
INSERT INTO orders VALUES (1, 100, today(), 99.99, 'pending');
```

Without quorum settings, ClickHouse uses an eventually consistent model: an insert succeeds as soon as the local replica writes the data. The other replica catches up asynchronously. This is fine for most analytics workloads but may not be acceptable if you need to read your own writes immediately.

## Preferred Replica for Reads

You can control which replica handles `SELECT` queries. This is useful for directing analytics queries to a read replica while keeping the primary replica for writes:

```sql
-- Check which replica is the current leader
SELECT
    replica_name,
    is_leader,
    is_readonly
FROM system.replicas
WHERE table = 'orders';

-- Set preferred replica by hostname or index
SET prefer_localhost_replica = 1;  -- Always prefer the local replica

-- Or set the load balancing mode for Distributed tables
SET load_balancing = 'nearest_hostname';
```

## Monitoring Replica Health

```sql
-- Overview of all replicated tables
SELECT
    database,
    table,
    is_leader,
    is_readonly,
    absolute_delay,
    queue_size,
    inserts_in_queue,
    merges_in_queue,
    log_max_index,
    log_pointer,
    total_replicas,
    active_replicas
FROM system.replicas
ORDER BY absolute_delay DESC;

-- Alert if absolute_delay exceeds 60 seconds
SELECT
    database,
    table,
    replica_name,
    absolute_delay
FROM system.replicas
WHERE absolute_delay > 60;
```

## Handling Read-Only Mode

A replica enters read-only mode when it cannot connect to ZooKeeper. In this state it stops accepting new inserts but continues serving reads from its local data:

```sql
-- Check for read-only replicas
SELECT
    database,
    table,
    is_readonly,
    last_queue_update_exception
FROM system.replicas
WHERE is_readonly = 1;
```

When ZooKeeper becomes available again, the replica automatically exits read-only mode and starts catching up. You can also trigger this manually:

```sql
-- Force re-initialization of replication for a specific table
SYSTEM RESTART REPLICA orders;

-- Force re-initialization of all replicated tables
SYSTEM RESTART REPLICAS;
```

## ZooKeeper Path Best Practices

Follow a consistent naming convention for ZooKeeper paths:

```text
/clickhouse/tables/{shard}/{database}/{table_name}
```

This convention makes it easy to find all tables for a given shard and avoids collisions when the same table name exists in different databases.

Avoid putting the environment (prod, staging) in the macro - use the ZooKeeper `<root>` config parameter for that:

```xml
<!-- In zookeeper.xml for staging -->
<root>/clickhouse-staging</root>

<!-- In zookeeper.xml for production -->
<root>/clickhouse-production</root>
```

This lets staging and production share the same ZooKeeper ensemble without path conflicts, while keeping table DDL identical between environments.
