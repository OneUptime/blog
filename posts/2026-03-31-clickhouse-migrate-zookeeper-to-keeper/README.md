# How to Migrate from ZooKeeper to ClickHouse Keeper

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, ClickHouse Keeper, ZooKeeper, Migration, Operation

Description: Learn how to migrate a production ClickHouse cluster from Apache ZooKeeper to ClickHouse Keeper with zero downtime using the built-in converter tool.

Migrating from ZooKeeper to ClickHouse Keeper removes a dependency on the Java ecosystem and simplifies operations. ClickHouse Keeper is protocol-compatible with ZooKeeper, so after migration no changes are needed to your replication configuration. ClickHouse provides a built-in converter that copies the ZooKeeper snapshot data into Keeper format. The migration can be done with minimal or zero downtime if planned carefully.

## Before You Start

Verify that your ClickHouse version supports the migration tooling:

```bash
clickhouse-keeper-converter --version
# This tool ships with ClickHouse 22.4 and later
```

Check that your ZooKeeper version is compatible (3.4.x, 3.5.x, 3.6.x are all supported):

```bash
echo "srvr" | nc zk1.internal 2181
```

Make sure you have enough disk space on the Keeper nodes to hold the converted snapshot. The converted data is roughly the same size as the original ZooKeeper data directory.

## Step 1: Take a ZooKeeper Snapshot

Stop writes to ClickHouse temporarily (optional but recommended for a clean migration):

```sql
-- On all ClickHouse nodes, stop inserts by disconnecting application traffic
-- Then wait for replication queues to drain
SELECT max(absolute_delay) FROM system.replicas;
-- Wait until this is 0 or near 0
```

Locate the ZooKeeper leader node, then find the most recent snapshot. ZooKeeper creates snapshots automatically based on its `snapCount` setting:

```bash
# Find the ZooKeeper leader
for h in zk1 zk2 zk3; do
    echo -n "${h}: "; echo "stat" | nc ${h}.internal 2181 | grep Mode
done
```

Find the most recent snapshot file in the ZooKeeper data directory on the leader:

```bash
ls -lht /var/lib/zookeeper/version-2/snapshot.* | head -3
# -rw-r--r-- 1 zookeeper zookeeper 45M Mar 31 10:00 snapshot.1a2b3c4d
```

## Step 2: Convert the ZooKeeper Snapshot

Use `clickhouse-keeper-converter` to convert the ZooKeeper snapshot to Keeper format. Run this on one of the future Keeper nodes:

```bash
clickhouse-keeper-converter \
    --zookeeper-logs-dir /var/lib/zookeeper/version-2 \
    --zookeeper-snapshots-dir /var/lib/zookeeper/version-2 \
    --output-dir /var/lib/clickhouse-keeper/snapshots

# The output is a Keeper-format snapshot file
ls -lh /var/lib/clickhouse-keeper/snapshots/
# snapshot_1234567.bin.zstd
```

If the ZooKeeper data is on a different server, copy it first:

```bash
rsync -av zk1.internal:/var/lib/zookeeper/version-2/ \
    /tmp/zk-snapshot/

clickhouse-keeper-converter \
    --zookeeper-logs-dir /tmp/zk-snapshot \
    --zookeeper-snapshots-dir /tmp/zk-snapshot \
    --output-dir /var/lib/clickhouse-keeper/snapshots
```

## Step 3: Deploy ClickHouse Keeper Nodes

Set up the 3-node Keeper cluster as described in the configuration guide. Make sure the snapshot directory is populated with the converted snapshot before starting Keeper.

```bash
# Verify the snapshot is in place
ls -lh /var/lib/clickhouse-keeper/snapshots/
chown -R clickhouse:clickhouse /var/lib/clickhouse-keeper/

# Start Keeper on all three nodes
systemctl start clickhouse-keeper
```

Wait a few seconds for the Raft election to complete, then verify the ensemble:

```bash
echo "stat" | nc keeper1.internal 2181
echo "ruok" | nc keeper1.internal 2181  # Should return: imok
```

## Step 4: Verify the Data Migration

Before switching ClickHouse to use Keeper, verify the data was migrated correctly:

```bash
# Connect to Keeper using clickhouse-keeper-client
clickhouse-keeper-client \
    --host keeper1.internal \
    --port 2181

# Inside the client:
> ls /clickhouse
> ls /clickhouse/tables
> ls /clickhouse/tables/01

# Should show the same data as ZooKeeper
```

Compare key paths between ZooKeeper and Keeper:

```bash
# Count nodes in ZooKeeper
zkCli.sh -server zk1.internal:2181 <<< "ls /clickhouse/tables/01/events/replicas" 2>/dev/null

# Count nodes in Keeper (should match)
clickhouse-keeper-client --host keeper1.internal --port 2181 <<< "ls /clickhouse/tables/01/events/replicas"
```

## Step 5: Switch ClickHouse to Use Keeper

On all ClickHouse nodes, update the ZooKeeper config to point to Keeper. This can be done with a config reload - no restart required:

```xml
<!-- /etc/clickhouse-server/config.d/zookeeper.xml -->
<!-- BEFORE: pointing to ZooKeeper -->
<!--
<zookeeper>
    <node><host>zk1.internal</host><port>2181</port></node>
    <node><host>zk2.internal</host><port>2181</port></node>
    <node><host>zk3.internal</host><port>2181</port></node>
</zookeeper>
-->

<!-- AFTER: pointing to ClickHouse Keeper -->
<clickhouse>
    <zookeeper>
        <node>
            <host>keeper1.internal</host>
            <port>2181</port>
        </node>
        <node>
            <host>keeper2.internal</host>
            <port>2181</port>
        </node>
        <node>
            <host>keeper3.internal</host>
            <port>2181</port>
        </node>
        <session_timeout_ms>30000</session_timeout_ms>
        <operation_timeout_ms>10000</operation_timeout_ms>
    </zookeeper>
</clickhouse>
```

Reload the config on all ClickHouse nodes simultaneously to minimize the window where some nodes use ZooKeeper and others use Keeper:

```bash
for host in ch1 ch2 ch3 ch4; do
    ssh ${host}.internal "systemctl reload clickhouse-server" &
done
wait
```

## Step 6: Verify Replication is Healthy

```sql
-- Check all replicas reconnected to Keeper
SELECT *
FROM system.zookeeper_connection;

-- Verify replication is working
SELECT
    database,
    table,
    is_readonly,
    absolute_delay,
    active_replicas,
    total_replicas
FROM system.replicas
WHERE is_readonly = 1 OR active_replicas < total_replicas;

-- Should return 0 rows if everything is healthy
```

```sql
-- Do a test insert and verify it replicates
INSERT INTO events VALUES (today(), now(), 9999, 'migration_test', '{}');

-- Check it appears on all replicas
SELECT count()
FROM clusterAllReplicas('production_cluster', currentDatabase(), events)
WHERE event_type = 'migration_test';
```

## Step 7: Decommission ZooKeeper

Once you have verified the migration is successful and stable for at least 24 hours:

```bash
# Stop ZooKeeper on all nodes
systemctl stop zookeeper
systemctl disable zookeeper

# Archive the data before removing
tar czf /backup/zookeeper-final-$(date +%Y%m%d).tar.gz /var/lib/zookeeper/
```

Keep the archive for at least 30 days before permanently removing the ZooKeeper data.

## Rollback Plan

If you need to roll back to ZooKeeper, reverse the ClickHouse config change and reload:

```bash
# The ZooKeeper data was not modified during migration
# Keeper nodes can be shut down and ZooKeeper restarted
systemctl stop clickhouse-keeper

# Revert the ClickHouse zookeeper.xml to point to ZooKeeper
# Reload ClickHouse config
for host in ch1 ch2 ch3 ch4; do
    ssh ${host}.internal "systemctl reload clickhouse-server" &
done
wait
```

Rollback is safe only if writes were paused during the migration window. If writes continued, the Keeper state may be ahead of ZooKeeper and rolling back will cause those writes to appear lost (they are not lost - they are in Keeper but not in ZooKeeper).
