# How to Roll Back a ClickHouse Upgrade

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Rollback, Upgrade, Operation, Administration, Disaster Recovery

Description: Learn how to roll back a ClickHouse upgrade to a previous version, handle schema incompatibilities between versions, and design your upgrade process to make rollbacks safe and fast.

---

Rolling back a ClickHouse upgrade is possible when the new version introduces a critical regression. The rollback process is essentially the inverse of the rolling upgrade: downgrade nodes one at a time while the cluster continues serving traffic. However, certain operations performed in the new version can make rollback impossible, so the key is avoiding those operations until you are confident the upgrade is stable.

## When Rollback is Possible

ClickHouse rollback is safe when:

- No schema changes (ALTER TABLE ADD COLUMN, etc.) have been applied that use features unavailable in the previous version
- No new data has been inserted using new column types (e.g., `Variant`, `JSON`)
- No `OPTIMIZE TABLE ... FINAL` has been run (this can write parts in a newer format)

Rollback becomes difficult or impossible when:

- Parts have been written in a data format only readable by the new version
- New system tables or columns have been referenced in materialized views
- Configuration options only available in the new version are in use

Check the data format version before deciding to roll back:

```sql
-- Review active parts distribution across tables
SELECT
    database,
    table,
    min(min_block_number) AS min_block,
    max(max_block_number) AS max_block
FROM system.parts
WHERE active = 1
GROUP BY database, table
ORDER BY database, table;

-- Check recently modified parts and their storage type
SELECT
    database,
    table,
    modification_time,
    part_type,
    rows_count
FROM system.parts
WHERE active = 1
ORDER BY modification_time DESC
LIMIT 20;
```

## Pre-Upgrade Steps That Enable Safe Rollback

Before upgrading, pin the previous version packages so they are available for rollback:

```bash
# Save current version
CURRENT_VERSION=$(clickhouse-client --query "SELECT version()")
echo "Current version: ${CURRENT_VERSION}"

# On Debian/Ubuntu: keep the old .deb packages
apt-get download \
  "clickhouse-server=${CURRENT_VERSION}" \
  "clickhouse-client=${CURRENT_VERSION}" \
  "clickhouse-common-static=${CURRENT_VERSION}"

# Move to a safe location
sudo mkdir -p /opt/clickhouse-packages
sudo mv clickhouse*.deb /opt/clickhouse-packages/
ls /opt/clickhouse-packages/
```

Create a snapshot before upgrading:

```bash
# Record all table schemas for rollback reference
clickhouse-client --query "
SELECT
    database,
    name,
    create_table_query
FROM system.tables
WHERE database NOT IN ('system','information_schema','INFORMATION_SCHEMA')
  AND engine LIKE '%MergeTree%'
ORDER BY database, name
" > /opt/clickhouse-packages/schemas-before-upgrade.sql
```

## Detecting Problems After Upgrade

Monitor for problems during and after the upgrade:

```bash
#!/bin/bash
# /usr/local/bin/clickhouse-post-upgrade-monitor.sh

echo "=== Post-Upgrade Health Monitor ==="

# Error rate
ERROR_COUNT=$(clickhouse-client --query "
SELECT sum(value)
FROM system.errors
WHERE last_error_time >= now() - INTERVAL 30 MINUTE
")
echo "Errors in last 30 minutes: ${ERROR_COUNT}"

# Replication lag
clickhouse-client --query "
SELECT
    database, table,
    is_readonly,
    queue_size,
    absolute_delay
FROM system.replicas
WHERE absolute_delay > 30 OR is_readonly = 1
ORDER BY absolute_delay DESC
"

# Query error rate
clickhouse-client --query "
SELECT
    countIf(type = 'ExceptionWhileProcessing') AS failed_queries,
    countIf(type = 'QueryFinish') AS successful_queries,
    round(countIf(type = 'ExceptionWhileProcessing') * 100.0 / count(), 2) AS error_rate_pct
FROM system.query_log
WHERE event_time >= now() - INTERVAL 30 MINUTE
"

# Check for new exception types since upgrade
clickhouse-client --query "
SELECT
    exception_code,
    count() AS occurrences,
    any(exception) AS sample_message
FROM system.query_log
WHERE
    type = 'ExceptionWhileProcessing'
    AND event_time >= now() - INTERVAL 1 HOUR
GROUP BY exception_code
ORDER BY occurrences DESC
LIMIT 10
"
```

## Rolling Back a Single Node

If you detect problems on a node after upgrading it, roll it back before proceeding to the next node:

```bash
#!/bin/bash
# Roll back a single ClickHouse node

NODE="${1:?Usage: $0 <node-hostname>}"
PREVIOUS_VERSION="${PREVIOUS_VERSION:?Set PREVIOUS_VERSION env variable}"

echo "Rolling back ${NODE} to ${PREVIOUS_VERSION}..."

# 1. Check what version the node is currently running
CURRENT=$(ssh "$NODE" "clickhouse-client --query 'SELECT version()'")
echo "Current version on ${NODE}: ${CURRENT}"

# 2. Stop the server gracefully
ssh "$NODE" "sudo systemctl stop clickhouse-server"

# 3. Install the previous version packages
ssh "$NODE" "sudo dpkg -i /opt/clickhouse-packages/clickhouse-common-static_${PREVIOUS_VERSION}*.deb"
ssh "$NODE" "sudo dpkg -i /opt/clickhouse-packages/clickhouse-server_${PREVIOUS_VERSION}*.deb"
ssh "$NODE" "sudo dpkg -i /opt/clickhouse-packages/clickhouse-client_${PREVIOUS_VERSION}*.deb"

# 4. Restore the previous configuration if it changed
# ssh "$NODE" "sudo cp /etc/clickhouse-server.backup/config.xml /etc/clickhouse-server/config.xml"

# 5. Start the server
ssh "$NODE" "sudo systemctl start clickhouse-server"

# 6. Wait for it to come up
for i in $(seq 1 30); do
    if ssh "$NODE" "curl -sf http://localhost:8123/ping" > /dev/null 2>&1; then
        echo "${NODE} is up"
        break
    fi
    echo "Waiting (${i}/30)..."
    sleep 10
done

# 7. Verify version
RESTORED_VERSION=$(ssh "$NODE" "clickhouse-client --query 'SELECT version()'")
echo "Version after rollback: ${RESTORED_VERSION}"
```

## Full Cluster Rollback

Roll back all nodes in the reverse order they were upgraded:

```bash
#!/bin/bash
# Full cluster rollback - reverse order from upgrade

NODES_REVERSED="clickhouse-3 clickhouse-2 clickhouse-1"
PREVIOUS_VERSION="${PREVIOUS_VERSION:?Set PREVIOUS_VERSION env variable}"

for NODE in $NODES_REVERSED; do
    echo "=== Rolling back ${NODE} to ${PREVIOUS_VERSION} ==="

    # Remove from load balancer
    echo "  Draining ${NODE}..."
    # aws elbv2 deregister-targets ...

    # Stop and downgrade
    ssh "$NODE" "sudo systemctl stop clickhouse-server"
    ssh "$NODE" "sudo apt-get install -y --allow-downgrades \
      clickhouse-server=${PREVIOUS_VERSION} \
      clickhouse-client=${PREVIOUS_VERSION} \
      clickhouse-common-static=${PREVIOUS_VERSION}"
    ssh "$NODE" "sudo systemctl start clickhouse-server"

    # Wait for healthy state
    for i in $(seq 1 30); do
        if ssh "$NODE" "curl -sf http://localhost:8123/ping" > /dev/null 2>&1; then
            echo "  ${NODE} is up with version: $(ssh "$NODE" "clickhouse-client --query 'SELECT version()'")"
            break
        fi
        sleep 10
    done

    # Re-add to load balancer
    echo "  Re-adding ${NODE} to load balancer..."
    # aws elbv2 register-targets ...

    echo "  Waiting 60s before next node..."
    sleep 60
done

echo "=== Cluster rollback complete ==="
```

## Recovering from a Failed Rollback

If the rollback itself fails (e.g., the package installation fails or the server will not start), restore from backup:

```bash
# Emergency: restore entire database from pre-upgrade backup
clickhouse-client --query "
RESTORE ASYNC ALL
FROM S3('https://s3.amazonaws.com/your-backup-bucket/clickhouse/pre-upgrade/24.6.1/');
"

# Monitor restore progress
clickhouse-client --query "
SELECT id, status, num_files, files_read, formatReadableSize(total_size) AS size
FROM system.backups
WHERE status = 'RESTORING'
ORDER BY start_time DESC
LIMIT 5;
"
```

## Preventing Rollback Issues

Follow these rules during the upgrade window to keep rollback available:

```sql
-- Do NOT run schema changes during the upgrade window
-- (Adding columns, changing types, etc.)

-- Do NOT run OPTIMIZE FINAL during the upgrade window
-- (This rewrites parts in the new format)

-- If you must run DDL, record it for manual reversal
ALTER TABLE events ADD COLUMN new_field String DEFAULT '';
-- Rollback DDL: ALTER TABLE events DROP COLUMN new_field;

-- Check if new parts were written in new formats after upgrade
SELECT
    database,
    table,
    max(modification_time) AS newest_part,
    count() AS parts_written_since_upgrade
FROM system.parts
WHERE
    modification_time > '2026-03-31 10:00:00'  -- upgrade start time
    AND active = 1
GROUP BY database, table
ORDER BY newest_part DESC;
```

## Summary

A safe ClickHouse rollback requires taking a pre-upgrade backup, saving the old version `.deb` packages in a local directory, and avoiding schema changes or `OPTIMIZE FINAL` during the upgrade window. If a problem is detected, roll back the affected nodes in reverse upgrade order using the saved packages. The key constraint is that ClickHouse can only roll back if the on-disk data format has not changed, which means not running any operations that rewrite parts in the new version's format until you are confident the upgrade is stable after a monitoring period of at least 24-48 hours.
