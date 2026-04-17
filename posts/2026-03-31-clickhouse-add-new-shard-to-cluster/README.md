# How to Add a New Shard to a ClickHouse Cluster

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Cluster, Shard, Scaling, Administration

Description: Learn how to add a new shard to an existing ClickHouse cluster, update distributed tables, and begin routing data to the new shard.

---

Adding a shard to a ClickHouse cluster lets you scale out storage and query capacity horizontally. This guide walks through the process from server setup to data rebalancing preparation.

## Step 1 - Set Up the New Shard Node

Install ClickHouse on the new node and configure it with the same `macros` and cluster definition as existing nodes. Edit `/etc/clickhouse-server/config.d/macros.xml`:

```xml
<macros>
    <cluster>my_cluster</cluster>
    <shard>3</shard>
    <replica>ch-shard3-replica1</replica>
</macros>
```

## Step 2 - Update Cluster Configuration on All Nodes

Add the new shard entry to your cluster config on every existing node. This must be done before the new node starts receiving data.

```xml
<remote_servers>
    <my_cluster>
        <shard>
            <replica><host>ch-node-01</host><port>9000</port></replica>
        </shard>
        <shard>
            <replica><host>ch-node-02</host><port>9000</port></replica>
        </shard>
        <!-- New shard -->
        <shard>
            <replica><host>ch-node-03</host><port>9000</port></replica>
        </shard>
    </my_cluster>
</remote_servers>
```

ClickHouse tracks changes to config files and reloads cluster, user, and related settings on the fly, so no restart is required. If you want to force a reload, you can run:

```sql
SYSTEM RELOAD CONFIG ON CLUSTER my_cluster;
```

## Step 3 - Create Tables on the New Shard

Create the local MergeTree table on the new shard node:

```sql
CREATE TABLE events_local ON CLUSTER my_cluster
(
    event_time DateTime,
    user_id UInt64,
    action String
)
ENGINE = ReplicatedMergeTree('/clickhouse/tables/{shard}/events_local', '{replica}')
PARTITION BY toYYYYMM(event_time)
ORDER BY (user_id, event_time);
```

The `ON CLUSTER` clause creates the table on all shards including the new one.

## Step 4 - Recreate the Distributed Table

Drop and recreate the Distributed table to include the new shard:

```sql
DROP TABLE IF EXISTS events ON CLUSTER my_cluster;

CREATE TABLE events ON CLUSTER my_cluster
AS events_local
ENGINE = Distributed(my_cluster, default, events_local, rand());
```

Using `rand()` as the sharding key distributes new inserts randomly across all shards including the new one.

## Step 5 - Verify the New Shard Is Receiving Data

After pointing traffic to the updated Distributed table, verify the new shard is receiving inserts:

```sql
SELECT
    hostName() AS host,
    count() AS row_count
FROM clusterAllReplicas('my_cluster', default, events_local)
GROUP BY host;
```

## Step 6 - Monitor Shard Balance

Track data distribution across shards over time:

```sql
SELECT
    hostName() AS host,
    formatReadableSize(sum(bytes_on_disk)) AS disk_usage,
    sum(rows) AS total_rows
FROM clusterAllReplicas('my_cluster', system, parts)
WHERE active AND database = 'default' AND table = 'events_local'
GROUP BY host
ORDER BY total_rows DESC;
```

## Summary

Adding a new shard involves updating the cluster config on all nodes, creating local tables on the new node using `ON CLUSTER`, and recreating the Distributed table. New inserts will flow to the new shard immediately. Historical data does not automatically move to the new shard - you need a rebalancing step for that, covered separately.
