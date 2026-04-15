# How to Upgrade ClickHouse with Zero Downtime

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Upgrade, Zero Downtime, Operation, Cluster, Replication

Description: Learn how to upgrade ClickHouse to a new version with zero downtime using a rolling upgrade strategy on replicated clusters, with pre-upgrade checks and compatibility validation.

---

ClickHouse supports rolling upgrades across patch and minor versions. Because replicated tables can tolerate a mixed-version cluster temporarily, you can upgrade nodes one at a time while the rest of the cluster continues serving traffic. This guide covers the complete rolling upgrade procedure from pre-upgrade preparation through final validation.

## Understanding Version Compatibility

ClickHouse uses a calendar-based `year.month.patch.build` version scheme (e.g., `24.3.5.46`):

- **Patch upgrades** (24.3.4 to 24.3.5): safe to roll across nodes while mixed
- **Minor upgrades** (24.3 to 24.4): check the changelog for compatibility notes; usually safe
- **Major upgrades** (23.x to 24.x): read the migration guide, may require sequential upgrade through intermediate versions

```bash
# Check current version on all nodes
for NODE in clickhouse-1 clickhouse-2 clickhouse-3; do
    echo -n "${NODE}: "
    ssh "$NODE" "clickhouse-client --query 'SELECT version()'"
done
```

## Pre-Upgrade Preparation

### Review the Changelog

```bash
# Download and review the changelog for your target version
TARGET_VERSION="24.6.1.4423"
curl -s "https://github.com/ClickHouse/ClickHouse/releases/tag/v${TARGET_VERSION}" | \
  python3 -c "
import sys, re
content = sys.stdin.read()
# Extract key changes
for line in content.split('\n'):
    if any(kw in line.lower() for kw in ['breaking', 'incompatible', 'security', 'deprecated']):
        print(line.strip())
"
```

### Backup Before Upgrading

```sql
-- Create a labeled pre-upgrade backup
BACKUP ALL
TO S3('https://s3.amazonaws.com/your-backup-bucket/clickhouse/pre-upgrade/24.6.1/')
ASYNC;
```

### Run the Pre-Upgrade Checklist

```bash
clickhouse-client --query "
SELECT
    'version'          AS check, version() AS value
UNION ALL
SELECT
    'active_queries',   toString(count())
FROM system.processes
UNION ALL
SELECT
    'replication_lag',  toString(max(absolute_delay))
FROM system.replicas
UNION ALL
SELECT
    'pending_mutations', toString(countIf(is_done = 0))
FROM system.mutations
UNION ALL
SELECT
    'readonly_replicas', toString(countIf(is_readonly = 1))
FROM system.replicas;
"
```

Wait for pending mutations to complete before upgrading:

```sql
-- Check mutations status
SELECT database, table, mutation_id, command, parts_to_do, is_done, latest_fail_reason
FROM system.mutations
WHERE is_done = 0
ORDER BY create_time;

-- Poll until all mutations are finished
SELECT mutation_id, database, table, parts_to_do
FROM system.mutations
WHERE is_done = 0;
```

## Downloading the New Version

```bash
TARGET_VERSION="24.6.1.4423.1"

# Debian/Ubuntu
sudo apt-get update

# Pin the target version to avoid unintended upgrades
echo "clickhouse-server hold" | sudo dpkg --set-selections
echo "clickhouse-client hold" | sudo dpkg --set-selections

# Download packages without installing
apt-get download \
  "clickhouse-server=${TARGET_VERSION}" \
  "clickhouse-client=${TARGET_VERSION}" \
  "clickhouse-common-static=${TARGET_VERSION}"

ls -la clickhouse*.deb
```

## Rolling Upgrade Procedure

Upgrade one node at a time. For a 3-node cluster, the procedure takes approximately 30-60 minutes:

```bash
#!/bin/bash
# /usr/local/bin/clickhouse-rolling-upgrade.sh

set -euo pipefail

NODES="${CLICKHOUSE_NODES:-clickhouse-1 clickhouse-2 clickhouse-3}"
TARGET_VERSION="${TARGET_VERSION:-24.6.1.4423.1}"
REPLICATION_LAG_THRESHOLD=30  # seconds
WAIT_BETWEEN_NODES=120  # seconds

log() {
    echo "[$(date '+%Y-%m-%dT%H:%M:%S')] $1"
}

wait_for_replication() {
    local node="$1"
    local max_wait=300
    local elapsed=0
    while [ $elapsed -lt $max_wait ]; do
        lag=$(ssh "$node" "clickhouse-client --query 'SELECT max(absolute_delay) FROM system.replicas'")
        if [ "${lag:-0}" -le "$REPLICATION_LAG_THRESHOLD" ]; then
            log "  ${node}: replication lag ${lag}s - OK"
            return 0
        fi
        log "  ${node}: replication lag ${lag}s - waiting..."
        sleep 15
        elapsed=$((elapsed + 15))
    done
    log "  ${node}: replication lag did not drop below threshold"
    return 1
}

wait_for_server() {
    local node="$1"
    local max_wait=180
    local elapsed=0
    while [ $elapsed -lt $max_wait ]; do
        if ssh "$node" "curl -sf http://localhost:8123/ping" > /dev/null 2>&1; then
            log "  ${node}: server is up"
            return 0
        fi
        sleep 5
        elapsed=$((elapsed + 5))
    done
    log "  ${node}: server did not come up within ${max_wait}s"
    return 1
}

for NODE in $NODES; do
    log "========== Upgrading ${NODE} =========="

    # 1. Check replication health before starting
    log "Step 1: Checking replication health..."
    wait_for_replication "$NODE"

    # 2. Check for no long-running queries
    log "Step 2: Checking for long-running queries..."
    LONG_QUERIES=$(ssh "$NODE" "clickhouse-client --query 'SELECT count() FROM system.processes WHERE elapsed > 60'")
    if [ "$LONG_QUERIES" -gt 0 ]; then
        log "WARNING: ${LONG_QUERIES} queries running >60s on ${NODE}"
        read -p "Continue anyway? [y/N] " CONTINUE
        [ "$CONTINUE" = "y" ] || exit 1
    fi

    # 3. Remove node from load balancer (if applicable)
    log "Step 3: Draining traffic from ${NODE}..."
    # Implement your load balancer drain here
    # e.g., aws elbv2 deregister-targets ...

    # 4. Install new version
    log "Step 4: Installing ClickHouse ${TARGET_VERSION}..."
    ssh "$NODE" "sudo apt-get install -y \
      clickhouse-server=${TARGET_VERSION} \
      clickhouse-client=${TARGET_VERSION} \
      clickhouse-common-static=${TARGET_VERSION}"

    # 5. Restart the service
    log "Step 5: Restarting ClickHouse..."
    ssh "$NODE" "sudo systemctl restart clickhouse-server"

    # 6. Wait for server to come back up
    log "Step 6: Waiting for server to come back up..."
    wait_for_server "$NODE"

    # 7. Verify new version
    NEW_VER=$(ssh "$NODE" "clickhouse-client --query 'SELECT version()'")
    log "Step 7: Version after upgrade: ${NEW_VER}"

    # 8. Re-add to load balancer
    log "Step 8: Re-adding ${NODE} to load balancer..."
    # Implement your load balancer registration here

    # 9. Wait for replication to catch up
    log "Step 9: Waiting for replication to sync..."
    sleep 30
    wait_for_replication "$NODE"

    log "========== ${NODE} upgraded successfully =========="
    log "Waiting ${WAIT_BETWEEN_NODES}s before next node..."
    sleep "$WAIT_BETWEEN_NODES"
done

log "========== Rolling upgrade complete =========="
```

## Post-Upgrade Validation

Run a full health check across all nodes after the upgrade is complete:

```bash
#!/bin/bash
# Verify all nodes are on the new version

TARGET_VERSION="24.6.1.4423.1"

for NODE in clickhouse-1 clickhouse-2 clickhouse-3; do
    echo "=== ${NODE} ==="

    # Check version
    version=$(ssh "$NODE" "clickhouse-client --query 'SELECT version()'")
    echo "  Version: ${version}"
    if [ "$version" != "$TARGET_VERSION" ]; then
        echo "  FAIL: Expected ${TARGET_VERSION}"
    fi

    # Check replication
    ssh "$NODE" "clickhouse-client --query \"
    SELECT database, table, is_readonly, queue_size, absolute_delay
    FROM system.replicas
    WHERE is_readonly = 1 OR absolute_delay > 60 OR queue_size > 100
    \""

    # HTTP health
    ssh "$NODE" "curl -sf http://localhost:8123/ping" && echo "  HTTP ping: OK"

    # Test query
    result=$(ssh "$NODE" "clickhouse-client --query 'SELECT count() FROM system.tables'")
    echo "  Tables count: ${result}"
done
```

## Checking for Compatibility Issues

After upgrading, check the system log for deprecation warnings and compatibility notices:

```sql
-- Check for warnings in the server log
SELECT
    event_time,
    level,
    message
FROM system.text_log
WHERE
    level IN ('Warning', 'Error', 'Fatal')
    AND event_time >= now() - INTERVAL 1 HOUR
ORDER BY event_time DESC
LIMIT 50;
```

Check for deprecated settings in use:

```bash
clickhouse-client --query "
SELECT name, value, description
FROM system.settings
WHERE is_obsolete = 1 AND changed = 1
ORDER BY name;
"
```

## Upgrading Across Multiple Minor Versions

When upgrading more than one minor version, use a sequential approach:

```bash
# Example: upgrading from 23.8 to 24.6 in steps
# 23.8 -> 24.1 -> 24.3 -> 24.6

UPGRADE_PATH="24.1.8.1 24.3.5.1 24.6.1.4423.1"

for VERSION in $UPGRADE_PATH; do
    echo "Upgrading all nodes to ${VERSION}..."
    TARGET_VERSION="$VERSION" /usr/local/bin/clickhouse-rolling-upgrade.sh
    echo "All nodes on ${VERSION}. Waiting 5 minutes before next step..."
    sleep 300
done
```

## Summary

Zero-downtime ClickHouse upgrades rely on rolling updates across replicated nodes: upgrade one node at a time, verify it comes back healthy and replication catches up, then proceed to the next node. Before starting, take a pre-upgrade backup, wait for all pending mutations to finish, and review the changelog for breaking changes. After upgrading each node, verify the version number, replication health, HTTP endpoint, and absence of errors in the text log. For upgrades spanning multiple minor versions, step through each minor version sequentially rather than skipping directly to the target.
