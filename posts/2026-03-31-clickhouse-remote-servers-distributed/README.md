# How to Configure ClickHouse Remote Servers for Distributed Queries

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Database, Distributed, Configuration, Cluster

Description: Learn how to configure ClickHouse remote_servers to define clusters, shards, and replicas for distributed query execution across multiple nodes.

---

ClickHouse scales horizontally through its Distributed table engine. A Distributed table is a logical proxy that fans queries out to underlying local tables on multiple shards. The cluster topology - which hosts form which shards and which are replicas of each other - is defined in the `<remote_servers>` section of the server configuration.

## Concepts: Clusters, Shards, and Replicas

- **Cluster** - a named group of servers that ClickHouse treats as one logical database for Distributed queries.
- **Shard** - a subset of the total data. Each shard holds a fraction of the rows. Queries are sent to all shards and results are merged.
- **Replica** - a copy of a shard. ClickHouse can route a query to any healthy replica of a shard. Replicas provide redundancy and read scaling.

## Defining a Cluster in config.xml

All cluster definitions go inside `<remote_servers>` in `/etc/clickhouse-server/config.xml` or a drop-in file such as `/etc/clickhouse-server/config.d/clusters.xml`:

```xml
<clickhouse>
    <remote_servers>

        <!-- Cluster name: used in CREATE TABLE ... ON CLUSTER and Distributed() engine -->
        <production_cluster>

            <!-- Shard 1 -->
            <shard>
                <weight>1</weight>
                <internal_replication>true</internal_replication>
                <replica>
                    <host>ch-node-01.internal</host>
                    <port>9000</port>
                </replica>
                <replica>
                    <host>ch-node-02.internal</host>
                    <port>9000</port>
                </replica>
            </shard>

            <!-- Shard 2 -->
            <shard>
                <weight>1</weight>
                <internal_replication>true</internal_replication>
                <replica>
                    <host>ch-node-03.internal</host>
                    <port>9000</port>
                </replica>
                <replica>
                    <host>ch-node-04.internal</host>
                    <port>9000</port>
                </replica>
            </shard>

        </production_cluster>

    </remote_servers>
</clickhouse>
```

This defines a two-shard cluster where each shard has two replicas. ClickHouse replicates data between replicas within a shard via ReplicatedMergeTree and ZooKeeper (or ClickHouse Keeper).

## Single-Shard Cluster for Testing

```xml
<clickhouse>
    <remote_servers>
        <single_node>
            <shard>
                <replica>
                    <host>127.0.0.1</host>
                    <port>9000</port>
                </replica>
            </shard>
        </single_node>
    </remote_servers>
</clickhouse>
```

## Authentication for Remote Connections

By default ClickHouse connects to remote shards as the `default` user with no password. To use a different user and password:

```xml
<clickhouse>
    <remote_servers>
        <production_cluster>
            <shard>
                <replica>
                    <host>ch-node-01.internal</host>
                    <port>9000</port>
                    <user>cluster_user</user>
                    <password>secret_password</password>
                </replica>
                <replica>
                    <host>ch-node-02.internal</host>
                    <port>9000</port>
                    <user>cluster_user</user>
                    <password>secret_password</password>
                </replica>
            </shard>
        </production_cluster>
    </remote_servers>
</clickhouse>
```

Alternatively, use the `<secret>` tag (ClickHouse 20.6+) to share an interserver secret rather than embedding credentials:

```xml
<clickhouse>
    <remote_servers>
        <production_cluster>
            <secret>my_interserver_secret_value</secret>
            <shard>
                <replica>
                    <host>ch-node-01.internal</host>
                    <port>9000</port>
                </replica>
            </shard>
        </production_cluster>
    </remote_servers>
</clickhouse>
```

All nodes in the cluster must have the same `<secret>` value.

## internal_replication Flag

The `<internal_replication>` flag controls who is responsible for writing data to all replicas:

- `true` - the Distributed table writes to only one replica per shard and lets ReplicatedMergeTree handle replication internally. **Recommended** for ReplicatedMergeTree tables.
- `false` - the Distributed table writes to all replicas itself. Use only with non-replicated tables.

```xml
<shard>
    <!-- Use true when your underlying table is a ReplicatedMergeTree -->
    <internal_replication>true</internal_replication>
    <replica>
        <host>ch-node-01.internal</host>
        <port>9000</port>
    </replica>
    <replica>
        <host>ch-node-02.internal</host>
        <port>9000</port>
    </replica>
</shard>
```

## Shard Weights

Weights control the proportion of new data routed to each shard when using a Distributed table in round-robin or random sharding mode:

```xml
<production_cluster>
    <shard>
        <weight>2</weight>  <!-- This shard receives twice as much data -->
        <replica>
            <host>ch-node-01.internal</host>
            <port>9000</port>
        </replica>
    </shard>
    <shard>
        <weight>1</weight>
        <replica>
            <host>ch-node-03.internal</host>
            <port>9000</port>
        </replica>
    </shard>
</production_cluster>
```

## Creating Local and Distributed Tables

```sql
-- Step 1: Create the local ReplicatedMergeTree table on every node
-- Run this on each node (or use ON CLUSTER with DDL replication)
CREATE TABLE events_local ON CLUSTER production_cluster
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
ORDER BY (event_date, user_id, event_time);

-- Step 2: Create the Distributed table that fans queries across shards
CREATE TABLE events ON CLUSTER production_cluster
(
    event_date  Date,
    event_time  DateTime,
    user_id     UInt64,
    event_type  LowCardinality(String),
    properties  String
)
ENGINE = Distributed(
    'production_cluster',   -- cluster name from remote_servers
    'default',              -- database name
    'events_local',         -- local table name on each shard
    rand()                  -- sharding key: distribute rows randomly
);
```

## Verifying Cluster Configuration

```sql
-- List all configured clusters and their shards/replicas
SELECT
    cluster,
    shard_num,
    replica_num,
    host_name,
    port,
    is_local
FROM system.clusters
WHERE cluster = 'production_cluster'
ORDER BY shard_num, replica_num;
```

```sql
-- Check connectivity to all remote nodes
SELECT
    cluster,
    shard_num,
    host_name,
    errors_count,
    slowdowns_count,
    estimated_recovery_time
FROM system.clusters
WHERE cluster = 'production_cluster';
```

## Query Routing Settings

```sql
-- Prefer local replicas to reduce network overhead
SELECT count()
FROM events
SETTINGS prefer_localhost_replica = 1;

-- Set connection timeout for remote shards (seconds)
SELECT count()
FROM events
SETTINGS
    connect_timeout = 5,
    receive_timeout = 30,
    send_timeout = 30;
```

## Common Multi-Cluster Pattern

Large deployments often define multiple clusters for different purposes:

```xml
<clickhouse>
    <remote_servers>

        <!-- Hot cluster: NVMe SSDs, recent data -->
        <hot_cluster>
            <shard>
                <replica><host>hot-01.internal</host><port>9000</port></replica>
                <replica><host>hot-02.internal</host><port>9000</port></replica>
            </shard>
        </hot_cluster>

        <!-- Cold cluster: HDDs, historical data -->
        <cold_cluster>
            <shard>
                <replica><host>cold-01.internal</host><port>9000</port></replica>
                <replica><host>cold-02.internal</host><port>9000</port></replica>
            </shard>
            <shard>
                <replica><host>cold-03.internal</host><port>9000</port></replica>
                <replica><host>cold-04.internal</host><port>9000</port></replica>
            </shard>
        </cold_cluster>

    </remote_servers>
</clickhouse>
```

## Conclusion

The `<remote_servers>` section is the foundation of any ClickHouse cluster deployment. Define each cluster by name, list shards and replicas within each shard, set `<internal_replication>` to `true` for ReplicatedMergeTree tables, and use the cluster name when creating Distributed tables and running `ON CLUSTER` DDL. Verify the topology with `system.clusters` and monitor replica health before routing production traffic to the cluster.
