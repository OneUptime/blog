# How to Add a New Replica to a ClickHouse Cluster

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Replication, Cluster, Database, Operation

Description: Step-by-step guide to adding a new replica to an existing ClickHouse shard, from server provisioning through config setup to verifying full data sync.

Adding a replica to a ClickHouse cluster is a common operation for scaling read capacity or improving fault tolerance. ClickHouse handles the data sync automatically once you configure the new node correctly. The main risk is getting the configuration wrong, which can create a new independent node rather than a replica of an existing shard. This guide walks through the process precisely.

## Prerequisites

Before adding a new replica:

1. The new server must be reachable by all existing ClickHouse nodes on ports 9000 (native), 8123 (HTTP), and 9009 (inter-server replication)
2. ClickHouse must be installed at the same version as the existing cluster
3. The new server must be able to reach ZooKeeper on port 2181
4. The new server needs enough disk space to hold a full copy of the shard's data

## Step 1: Install ClickHouse on the New Server

```bash
# Install the same version as the existing cluster
apt-get install -y clickhouse-server clickhouse-client

# Verify version matches
clickhouse-server --version
```

## Step 2: Copy Configuration Files

Copy the cluster configuration from an existing node. Do not copy `macros.xml` - you will create that separately:

```bash
# From the new server, pull configs from an existing node
scp ch1.internal:/etc/clickhouse-server/config.d/zookeeper.xml \
    /etc/clickhouse-server/config.d/

scp ch1.internal:/etc/clickhouse-server/config.d/cluster.xml \
    /etc/clickhouse-server/config.d/

scp ch1.internal:/etc/clickhouse-server/users.d/users.xml \
    /etc/clickhouse-server/users.d/
```

Update `cluster.xml` to include the new replica in the correct shard. Add the new node to the shard it should replicate:

```xml
<!-- /etc/clickhouse-server/config.d/cluster.xml on ALL nodes -->
<clickhouse>
    <remote_servers>
        <production_cluster>
            <shard>
                <internal_replication>true</internal_replication>
                <replica>
                    <host>ch1.internal</host>
                    <port>9000</port>
                </replica>
                <replica>
                    <host>ch2.internal</host>
                    <port>9000</port>
                </replica>
                <!-- New replica added here -->
                <replica>
                    <host>ch3-new.internal</host>
                    <port>9000</port>
                </replica>
            </shard>
        </production_cluster>
    </remote_servers>
</clickhouse>
```

Push the updated `cluster.xml` to all existing nodes and reload their config:

```bash
for host in ch1.internal ch2.internal; do
    scp /etc/clickhouse-server/config.d/cluster.xml \
        ${host}:/etc/clickhouse-server/config.d/
    ssh $host "systemctl reload clickhouse-server"
done
```

## Step 3: Set the Macros for the New Replica

Create `/etc/clickhouse-server/config.d/macros.xml` on the new server with unique values:

```xml
<!-- /etc/clickhouse-server/config.d/macros.xml on ch3-new.internal -->
<clickhouse>
    <macros>
        <cluster>production_cluster</cluster>
        <shard>01</shard>
        <replica>ch3-new.internal</replica>
    </macros>
</clickhouse>
```

The `<shard>` value must match the shard this node belongs to. The `<replica>` value must be unique within that shard.

## Step 4: Start ClickHouse on the New Server

```bash
systemctl start clickhouse-server
systemctl enable clickhouse-server

# Verify it started successfully
systemctl status clickhouse-server
journalctl -u clickhouse-server -n 50
```

## Step 5: Create Tables on the New Replica

The new replica needs all the same tables as the existing replicas. If you use the same `ReplicatedMergeTree` ZooKeeper path and a unique replica name, ClickHouse will automatically start syncing data:

```sql
-- Run this on the new node (ch3-new.internal)
-- Use the exact same DDL as the existing nodes, the macros handle the uniqueness
CREATE TABLE events
(
    event_date  Date,
    event_time  DateTime,
    user_id     UInt64,
    event_type  LowCardinality(String),
    properties  String
)
ENGINE = ReplicatedMergeTree(
    '/clickhouse/tables/{shard}/events',
    '{replica}'
)
PARTITION BY toYYYYMM(event_date)
ORDER BY (event_type, event_date, user_id);
```

As soon as you create this table, ClickHouse registers the new replica in ZooKeeper at `/clickhouse/tables/01/events/replicas/ch3-new.internal` and immediately starts fetching all data parts from `ch1.internal` or `ch2.internal`.

If you have many tables, use `ON CLUSTER` from an existing node instead of connecting to the new node:

```sql
-- This creates the table on ALL cluster nodes including the new one
-- Run from an existing node after updating cluster.xml
CREATE TABLE IF NOT EXISTS events ON CLUSTER production_cluster
(
    event_date  Date,
    event_time  DateTime,
    user_id     UInt64,
    event_type  LowCardinality(String),
    properties  String
)
ENGINE = ReplicatedMergeTree(
    '/clickhouse/tables/{shard}/events',
    '{replica}'
)
PARTITION BY toYYYYMM(event_date)
ORDER BY (event_type, event_date, user_id);
```

## Step 6: Monitor Sync Progress

The new replica will download all data parts. Monitor the progress:

```sql
-- Run on the new node
SELECT
    database,
    table,
    queue_size,
    inserts_in_queue,
    merges_in_queue,
    absolute_delay,
    active_replicas,
    total_replicas
FROM system.replicas
ORDER BY queue_size DESC;
```

You can also watch the log:

```bash
journalctl -u clickhouse-server -f | grep -i "fetch\|Fetching\|Replica"
```

The sync time depends on the total data size and network speed. For large shards (hundreds of GB), expect several hours.

## Step 7: Verify the New Replica is Healthy

Once `queue_size` reaches 0 and `absolute_delay` is near 0:

```sql
-- Confirm the new replica is fully caught up
SELECT
    database,
    table,
    is_leader,
    is_readonly,
    absolute_delay,
    queue_size,
    active_replicas,
    total_replicas
FROM system.replicas
WHERE active_replicas = total_replicas;

-- Verify row counts match across replicas
SELECT
    hostName() AS host,
    replica_name,
    count() AS table_count
FROM clusterAllReplicas('production_cluster', system, replicas)
WHERE _shard_num = 1
GROUP BY host, replica_name;

-- Check part counts match for a specific table
SELECT
    hostName() AS host,
    count() AS part_count
FROM clusterAllReplicas('production_cluster', system, parts)
WHERE table = 'events'
  AND active = 1
GROUP BY host;
```

## Common Issues

**New node creates an independent table instead of joining replication**: This happens when the ZooKeeper path does not match the existing tables. Double-check the path in the `ENGINE` clause and the `<shard>` macro value.

**Sync is extremely slow**: Check if the network between nodes is saturated. Reduce the fetch bandwidth limit, or run the sync during off-peak hours.

**Tables already exist on the new node from a previous attempt**: Drop them and recreate:

```sql
-- On the new node
DROP TABLE IF EXISTS events;

-- Then recreate with the correct ReplicatedMergeTree engine
```

**`total_replicas` is not updated**: This means the cluster.xml update did not propagate to all nodes. Verify the file is identical on all servers and reload the config.
