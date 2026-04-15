# How to Remove a Replica from a ClickHouse Cluster

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Cluster, Replication, Administration, ReplicatedMergeTree

Description: Step-by-step guide to safely removing a replica node from a ClickHouse cluster while preserving data integrity and cluster availability.

---

Removing a replica from a ClickHouse cluster requires careful coordination to avoid data loss and maintain quorum. This guide covers the process for ReplicatedMergeTree tables using both ZooKeeper and ClickHouse Keeper.

## Before You Remove a Replica

Verify the replica is fully synchronized before removal. A replica with lagging replication may hold unique data if other replicas have not yet received it.

```sql
SELECT
    database,
    table,
    is_leader,
    total_replicas,
    active_replicas,
    queue_size,
    absolute_delay
FROM system.replicas
WHERE is_readonly = 0
ORDER BY absolute_delay DESC;
```

Wait until `absolute_delay` is 0 and `queue_size` is 0 for all tables on the replica you want to remove.

## Step 1 - Stop Inserts to the Replica

Before decommissioning the node, stop routing inserts to it. Update your load balancer or application configuration to exclude the replica. This prevents new data from being written only to the departing node.

## Step 2 - Remove the Replica from config.xml

Edit your ClickHouse cluster configuration to remove the replica entry. The cluster config lives in `/etc/clickhouse-server/config.xml` or a file under `/etc/clickhouse-server/config.d/`.

```xml
<remote_servers>
    <my_cluster>
        <shard>
            <replica>
                <host>ch-node-01</host>
                <port>9000</port>
            </replica>
            <!-- Remove the entry below -->
            <!--
            <replica>
                <host>ch-node-02</host>
                <port>9000</port>
            </replica>
            -->
        </shard>
    </my_cluster>
</remote_servers>
```

Reload the configuration on all remaining nodes without a full restart:

```bash
sudo systemctl reload clickhouse-server
```

## Step 3 - Stop ClickHouse on the Departing Node

Shut down the ClickHouse service on the node being removed. The `SYSTEM DROP REPLICA` command in the next step only works on inactive replicas, so the service must be stopped first.

```bash
sudo systemctl stop clickhouse-server
sudo systemctl disable clickhouse-server
```

## Step 4 - Drop the Replica from ZooKeeper Metadata

ClickHouse stores replica metadata in ZooKeeper or Keeper. You need to explicitly drop the replica to clean up the stale metadata. Run the following on any remaining active node.

To drop the replica from all replicated tables at once:

```sql
SYSTEM DROP REPLICA 'ch-node-02';
```

To drop from a specific table instead:

```sql
SYSTEM DROP REPLICA 'ch-node-02' FROM TABLE my_database.my_table;
```

If you need to generate per-table commands, query `system.replicas`:

```sql
SELECT
    'SYSTEM DROP REPLICA ''ch-node-02'' FROM TABLE ' || database || '.' || table || ';' AS drop_command
FROM system.replicas;
```

## Step 5 - Verify Removal

After dropping the replica metadata, confirm the replica count has decreased:

```sql
SELECT
    database,
    table,
    replica_name,
    total_replicas
FROM system.replicas
ORDER BY database, table;
```

Also check ZooKeeper directly if needed:

```bash
clickhouse-keeper-client -h localhost -p 9181 -q "ls /clickhouse/tables/my_database/my_table/replicas"
```

## Summary

Removing a replica from a ClickHouse cluster involves stopping inserts to the departing node, updating the cluster configuration on remaining nodes, shutting down the ClickHouse service on the departing node, and then dropping the replica's ZooKeeper metadata using `SYSTEM DROP REPLICA`. Stopping the service before dropping the metadata is important because `SYSTEM DROP REPLICA` only works on inactive replicas.
