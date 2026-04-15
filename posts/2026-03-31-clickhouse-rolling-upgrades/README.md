# How to Perform Rolling Upgrades on ClickHouse Clusters

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Upgrade, Rolling Upgrade, Cluster, Zero Downtime

Description: Learn how to perform zero-downtime rolling upgrades on ClickHouse clusters by upgrading one replica at a time while maintaining availability.

---

Rolling upgrades let you upgrade a ClickHouse cluster without downtime by upgrading one node at a time while other replicas continue serving traffic. ClickHouse's replication protocol is backward compatible for one version, making this safe for incremental upgrades.

## Prerequisites

Before starting a rolling upgrade:

```bash
# Verify all nodes are healthy and replication is caught up
clickhouse-client --query "
SELECT hostName(), is_readonly, inserts_in_queue, merges_in_queue
FROM clusterAllReplicas('production', system.replicas)
WHERE inserts_in_queue > 0 OR merges_in_queue > 0
"
```

All nodes should have zero queue depth. If not, wait for replication to catch up.

## Step 1: Take a Full Backup

Before any upgrade, create a backup from any one node:

```sql
BACKUP DATABASE production
TO Disk('backups', 'pre_upgrade_2026-03-31/');
```

## Step 2: Upgrade Non-Leader Replicas First

For each shard, upgrade non-leader replicas before the leader:

```bash
# On the first non-leader node:
# 1. Stop ClickHouse
sudo systemctl stop clickhouse-server

# 2. Install new version
sudo apt-get install -y clickhouse-server=24.8.5.115 clickhouse-client=24.8.5.115

# 3. Start ClickHouse
sudo systemctl start clickhouse-server

# 4. Wait for it to rejoin and catch up
clickhouse-client --query "SELECT is_readonly, inserts_in_queue FROM system.replicas LIMIT 5"
```

Wait until `inserts_in_queue` and `merges_in_queue` return to zero before upgrading the next node.

## Step 3: Verify Node Health After Each Upgrade

Run health checks on the freshly upgraded node:

```bash
# Check server is running
curl -s http://localhost:8123/ping

# Verify version
clickhouse-client --query "SELECT version()"

# Check replication status
clickhouse-client --query "
SELECT database, table, is_leader, is_readonly, inserts_in_queue
FROM system.replicas
WHERE is_readonly = 1 OR inserts_in_queue > 10
"
```

## Step 4: Upgrade Leader Replicas

After all non-leader replicas are upgraded, upgrade the leader nodes:

```bash
# Check which node is the leader
clickhouse-client --query "
SELECT hostName(), database, table, is_leader
FROM clusterAllReplicas('production', system.replicas)
WHERE is_leader = 1
"
```

Upgrade leader nodes following the same process: stop, install, start, wait for catch-up.

## Step 5: Verify Full Cluster Health

After upgrading all nodes, verify the entire cluster:

```bash
clickhouse-client --query "
SELECT
    hostName() AS host,
    version() AS version,
    uptime() AS uptime_seconds
FROM clusterAllReplicas('production', system.one)
ORDER BY host
"
```

All nodes should report the same new version.

## Handling Upgrade Failures

If a node fails to start after upgrade:

```bash
# Check ClickHouse error log
tail -100 /var/log/clickhouse-server/clickhouse-server.err.log

# If necessary, rollback to previous version
sudo apt-get install -y clickhouse-server=24.3.5.46 clickhouse-client=24.3.5.46
sudo systemctl start clickhouse-server
```

## Rolling Upgrade Automation Script

```bash
#!/bin/bash
NODES=("ch-node-1" "ch-node-2" "ch-node-3")
NEW_VERSION="24.8.5.115"

for node in "${NODES[@]}"; do
    echo "Upgrading $node to $NEW_VERSION..."

    ssh "$node" "sudo systemctl stop clickhouse-server"
    ssh "$node" "sudo apt-get install -y clickhouse-server=${NEW_VERSION} clickhouse-client=${NEW_VERSION}"
    ssh "$node" "sudo systemctl start clickhouse-server"

    # Wait for replication to catch up
    sleep 30
    ssh "$node" "clickhouse-client --query \"SELECT version(), inserts_in_queue FROM system.replicas LIMIT 1\""

    echo "$node upgrade complete"
done
```

## Summary

Rolling upgrades on ClickHouse clusters involve upgrading one node at a time, starting with non-leader replicas and ending with leaders. Verify replication queue depth reaches zero between each node upgrade. Always back up before starting, monitor health checks after each node, and have a rollback plan ready. ClickHouse's backward-compatible replication protocol makes one-version rolling upgrades safe.
