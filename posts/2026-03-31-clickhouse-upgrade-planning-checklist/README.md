# ClickHouse Upgrade Planning Checklist

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Upgrade, Checklist, Version Management, Operation

Description: A ClickHouse upgrade planning checklist covering pre-upgrade validation, rolling upgrade procedure, compatibility checks, and rollback planning.

---

Upgrading ClickHouse requires careful planning to avoid downtime, data incompatibilities, and failed replications. ClickHouse releases new stable versions every month. This checklist ensures a safe upgrade path.

## Pre-Upgrade Research

```text
[ ] Read the changelog for all versions between current and target version
    (https://github.com/ClickHouse/ClickHouse/blob/master/CHANGELOG.md)
[ ] Check for breaking changes in SQL syntax, settings, or behavior
[ ] Check for deprecated settings that need to be removed before upgrade
[ ] Verify all clients and libraries support the new protocol version
[ ] Check ClickHouse version support matrix for your Grafana/Superset version
```

## Compatibility Matrix

```sql
-- Record current version before upgrading
SELECT version();

-- Check server uptime and database count before upgrade
SELECT uptime() AS uptime_seconds, count() AS database_count
FROM system.databases;
```

```text
[ ] clickhouse-client version matches server version
[ ] Application driver versions support the new server version
[ ] Keeper/ZooKeeper version is compatible with new ClickHouse version
```

## Pre-Upgrade Validation

```sql
-- Check for any pending mutations that should complete before upgrade
SELECT database, table, command, parts_to_do, create_time
FROM system.mutations
WHERE is_done = 0
ORDER BY create_time;

-- Verify replication is healthy
SELECT table, is_leader, absolute_delay
FROM system.replicas
WHERE is_readonly = 1 OR absolute_delay > 60;

-- Check for any in-progress merges
SELECT table, progress, total_size_bytes_compressed
FROM system.merges
WHERE progress < 1;
```

## Staging Environment Test

```text
[ ] Upgrade tested on staging environment that mirrors production schema
[ ] All application queries tested against upgraded staging instance
[ ] Load test run against staging after upgrade
[ ] Rollback tested on staging (downgrade to previous version)
```

## Rolling Upgrade Procedure

For clusters with replication, upgrade one node at a time:

```bash
# Step 1: Stop ClickHouse on the node to upgrade
sudo systemctl stop clickhouse-server

# Step 2: Install new version
sudo apt-get install clickhouse-server=24.1.0 clickhouse-client=24.1.0

# Step 3: Start ClickHouse
sudo systemctl start clickhouse-server

# Step 4: Verify health
curl -s "http://localhost:8123/ping"
clickhouse-client --query "SELECT version()"

# Step 5: Verify replication resync
clickhouse-client --query "SELECT table, is_leader, absolute_delay FROM system.replicas"

# Step 6: Repeat for each node
```

## Post-Upgrade Validation

```sql
-- Verify version on all nodes
SELECT hostName(), version()
FROM clusterAllReplicas('production', system.one);

-- Verify replication is healthy on all nodes
SELECT hostName(), table, absolute_delay
FROM clusterAllReplicas('production', system.replicas)
WHERE absolute_delay > 60;

-- Run smoke test queries
SELECT count() FROM events WHERE event_time >= today();
```

## Rollback Plan

```text
[ ] Previous package version pinned and available in package cache
[ ] Data backup taken immediately before upgrade
[ ] Rollback script tested on staging
[ ] Maximum downtime budget defined (rollback triggered if exceeded)
```

```bash
# Rollback to previous version
sudo systemctl stop clickhouse-server
sudo apt-get install clickhouse-server=23.12.0 clickhouse-client=23.12.0
sudo systemctl start clickhouse-server
```

## Summary

Safe ClickHouse upgrades require reading the changelog for breaking changes, testing on staging, upgrading one replica at a time to maintain availability, and having a tested rollback plan ready. Never upgrade all nodes simultaneously - always use rolling upgrades on clustered deployments.
