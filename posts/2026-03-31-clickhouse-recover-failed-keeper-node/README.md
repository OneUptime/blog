# How to Recover a Failed ClickHouse Keeper Node

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Keeper, Recovery, Raft, Node Failure

Description: Learn how to recover a single failed ClickHouse Keeper node and rejoin it to the cluster without disrupting the remaining nodes or losing coordination data.

---

When one node in a three-node ClickHouse Keeper cluster fails, the remaining two nodes maintain quorum and continue operating normally. Recovering the failed node requires cleaning its stale state and allowing it to sync from the leader.

## Assess the Cluster State

Before recovering, confirm the other two nodes are healthy:

```bash
for host in keeper-01 keeper-02 keeper-03; do
    echo -n "$host: "
    clickhouse-keeper-client -h $host -p 9181 -q "ruok" 2>/dev/null || echo "UNREACHABLE"
done
```

The two healthy nodes should return `imok`. The failed node returns nothing or an error.

## Determine the Failure Cause

Check logs on the failed node after access is restored:

```bash
sudo journalctl -u clickhouse-keeper --since "1 hour ago" | tail -100
```

Common causes:
- Disk full (log storage exhausted)
- Network partition (Raft peers unreachable)
- Corrupted log or snapshot files
- OOM kill

## Step 1 - Fix the Underlying Issue

Address the root cause before attempting recovery:

```bash
# Check disk usage
df -h /var/lib/clickhouse/coordination/

# Check for corrupted files
ls -la /var/lib/clickhouse/coordination/log/
ls -la /var/lib/clickhouse/coordination/snapshots/
```

## Step 2 - Clear Stale State for a Fresh Join

If the node has corrupted coordination data, clear it and let Raft sync from the leader:

```bash
sudo systemctl stop clickhouse-keeper

# Backup existing data first
sudo cp -r /var/lib/clickhouse/coordination /var/lib/clickhouse/coordination.bak

# Clear log and snapshot data
sudo rm -rf /var/lib/clickhouse/coordination/log/*
sudo rm -rf /var/lib/clickhouse/coordination/snapshots/*
```

## Step 3 - Restart and Rejoin

Start the Keeper service. The node will contact the cluster leader and download a snapshot to sync its state:

```bash
sudo systemctl start clickhouse-keeper

# Watch logs for sync progress
sudo journalctl -u clickhouse-keeper -f | grep -E "snapshot|sync|leader|follower"
```

Expect to see messages about downloading the latest snapshot from the leader.

## Step 4 - Verify the Node Rejoined

```bash
clickhouse-keeper-client -h localhost -p 9181 -q "stat" | grep -E "Mode|Connections"
```

The recovered node should show `Mode: follower` once it has rejoined.

Check from the leader that all three nodes are part of the quorum:

```bash
clickhouse-keeper-client -h keeper-01 -p 9181 -q "mntr" | grep -E "zk_followers|zk_synced_followers"
# Should show:
# zk_followers	2
# zk_synced_followers	2
```

## Step 5 - Verify ClickHouse Server Connectivity

Confirm ClickHouse servers reconnected to all three Keeper nodes:

```sql
SELECT * FROM system.zookeeper_connection;
```

```sql
-- Check replication resumed normally
SELECT
    database,
    table,
    active_replicas,
    total_replicas
FROM system.replicas
WHERE active_replicas < total_replicas;
```

## Preventing Future Failures

Monitor disk usage on Keeper nodes to prevent log exhaustion:

```bash
du -sh /var/lib/clickhouse/coordination/log/
```

Configure automatic log rotation in Keeper:

```xml
<coordination_settings>
    <rotate_log_storage_interval>100000</rotate_log_storage_interval>
    <snapshots_to_keep>3</snapshots_to_keep>
</coordination_settings>
```

## Summary

Recovering a failed ClickHouse Keeper node involves identifying and fixing the root cause, clearing stale coordination data if necessary, restarting the service, and verifying that the node rejoins as a follower. The cluster remains fully operational during recovery as long as the other two nodes maintain quorum.
