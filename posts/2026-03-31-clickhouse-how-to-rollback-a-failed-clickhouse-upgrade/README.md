# How to Rollback a Failed ClickHouse Upgrade

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Upgrade, Rollback, Administration, Disaster Recovery

Description: Learn how to safely rollback a failed ClickHouse version upgrade by downgrading packages, restoring metadata, and verifying cluster health after recovery.

---

## Before Upgrading - Preparation Steps

Prepare for a safe rollback before any upgrade:

```bash
# Record current version
clickhouse-server --version

# Back up server config files
cp -r /etc/clickhouse-server/ /backup/clickhouse-config-$(date +%Y%m%d)/

# Create a data backup
clickhouse-backup create pre_upgrade_$(date +%Y%m%d)
clickhouse-backup upload pre_upgrade_$(date +%Y%m%d)

# Record table metadata
clickhouse-client -q "
SELECT
    database,
    name,
    engine,
    create_table_query
FROM system.tables
WHERE database NOT IN ('system', 'information_schema')
" > /backup/table_schemas_$(date +%Y%m%d).sql
```

## Identifying a Failed Upgrade

Signs of a failed upgrade:

```bash
# Check if ClickHouse started successfully
systemctl status clickhouse-server

# Check for startup errors
journalctl -u clickhouse-server -n 100

# Check ClickHouse error log
tail -100 /var/log/clickhouse-server/clickhouse-server.err.log
```

Common failures:

```text
# Data format incompatibility
DB::Exception: Cannot read all data. Expected 8 bytes, read 4 bytes

# ZooKeeper/Keeper incompatibility
DB::Exception: Keeper connection timeout

# Config parsing failure
Exception: Cannot parse config file
```

## Rolling Back on Debian/Ubuntu

```bash
# Stop the failing version
systemctl stop clickhouse-server

# List installed versions
dpkg -l | grep clickhouse

# Downgrade to previous version (replace X.Y.Z with old version)
apt-get install -y \
    clickhouse-server=X.Y.Z \
    clickhouse-client=X.Y.Z \
    clickhouse-common-static=X.Y.Z

# Hold the package to prevent auto-upgrade
apt-mark hold clickhouse-server clickhouse-client clickhouse-common-static
```

## Rolling Back on Red Hat/CentOS

```bash
# Stop the service
systemctl stop clickhouse-server

# List available versions
yum list --showduplicates clickhouse-server

# Downgrade to previous version
yum downgrade clickhouse-server-X.Y.Z \
              clickhouse-client-X.Y.Z \
              clickhouse-common-static-X.Y.Z

# Prevent future auto-upgrade
yum versionlock clickhouse-server clickhouse-client clickhouse-common-static
```

## Restoring Config If Upgrade Overwrote It

```bash
# Restore from backup
cp -r /backup/clickhouse-config-$(date +%Y%m%d)/. /etc/clickhouse-server/
chown -R clickhouse:clickhouse /etc/clickhouse-server/
```

## Starting the Previous Version

```bash
systemctl start clickhouse-server
systemctl status clickhouse-server

# Verify the version
clickhouse-client -q "SELECT version()"
```

## Verifying Cluster Health After Rollback

```sql
-- Check replication status
SELECT
    database,
    table,
    replica_name,
    is_leader,
    is_readonly,
    total_replicas,
    active_replicas
FROM system.replicas
WHERE is_readonly = 1 OR active_replicas < total_replicas;

-- Check for replication errors
SELECT
    database,
    table,
    last_queue_update_exception,
    zookeeper_exception
FROM system.replicas
WHERE last_queue_update_exception != '' OR zookeeper_exception != '';

-- Verify part counts are healthy
SELECT
    database,
    table,
    count() AS parts
FROM system.parts
WHERE active = 1
GROUP BY database, table
ORDER BY parts DESC
LIMIT 10;
```

## Fixing Readonly Replicas After Rollback

```sql
-- If replicas are stuck in readonly mode
SYSTEM RESTART REPLICA database.table;

-- Or re-attach all replicas
SYSTEM SYNC REPLICA database.table;
```

## Rolling Back in a Cluster - Rolling Procedure

For a multi-node cluster, roll back one node at a time:

```bash
# On node 1
systemctl stop clickhouse-server
apt-get install -y clickhouse-server=X.Y.Z clickhouse-client=X.Y.Z
systemctl start clickhouse-server

# Wait for node 1 to sync with cluster
clickhouse-client -q "SELECT is_leader, active_replicas FROM system.replicas LIMIT 1"

# Repeat for node 2, 3, etc.
```

## Documenting the Issue

After rollback, record the failure details:

```bash
# Save error logs for analysis
journalctl -u clickhouse-server --since "2026-03-31 10:00" \
    --until "2026-03-31 11:00" > /tmp/upgrade_failure.log

# Check ClickHouse release notes for breaking changes
# https://github.com/ClickHouse/ClickHouse/blob/master/CHANGELOG.md
```

## Summary

Rollback a failed ClickHouse upgrade by stopping the service, downgrading packages using the OS package manager, restoring configuration backups, and restarting. Always prepare before upgrading by creating a full backup, recording the current version, and backing up configs. In cluster environments, roll back one node at a time and wait for replication to stabilize before proceeding to the next node.
