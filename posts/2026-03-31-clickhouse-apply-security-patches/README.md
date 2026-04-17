# How to Apply ClickHouse Security Patches

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Security, PATCH, Administration, Upgrade, Operation

Description: Learn how to identify, evaluate, and apply ClickHouse security patches safely with pre-patch checklists, rolling update procedures for replicated clusters, and post-patch verification steps.

---

Security patches for ClickHouse are released as patch versions (e.g., 24.3.4.1 to 24.3.5.1) and sometimes as advisories that require a minor version bump. Applying them on a production cluster requires a pre-patch verification checklist, a rolling update strategy to avoid downtime, and post-patch validation to confirm the fix is in place and the service is healthy.

## Identifying Available Security Patches

ClickHouse publishes releases on GitHub and in their security advisory tracker:

```bash
# Check current version
clickhouse-client --query "SELECT version()"

# Check available versions in the package repository (Debian/Ubuntu)
apt-cache show clickhouse-server | grep Version | head -10

# List all available versions
apt-cache madison clickhouse-server | head -20

# Check the official GitHub releases for security advisories
curl -s https://api.github.com/repos/ClickHouse/ClickHouse/releases \
  | python3 -c "
import sys, json
releases = json.load(sys.stdin)
for r in releases[:10]:
    print(r['tag_name'], '-', r['name'])
    if 'security' in r['name'].lower() or 'security' in r.get('body', '').lower()[:100]:
        print('  *** SECURITY RELEASE ***')
"
```

Subscribe to ClickHouse security announcements:

```bash
# Check the security changelog directly
curl -s https://raw.githubusercontent.com/ClickHouse/ClickHouse/master/SECURITY.md | head -50
```

## Pre-Patch Checklist

Before applying any patch, run through this checklist:

```bash
#!/bin/bash
# /usr/local/bin/clickhouse-pre-patch-check.sh

echo "=== ClickHouse Pre-Patch Checklist ==="

# 1. Current version
echo "1. Current version:"
clickhouse-client --query "SELECT version()"

# 2. Replication health
echo "2. Replication status:"
clickhouse-client --query "
SELECT database, table, is_readonly, queue_size, absolute_delay
FROM system.replicas
WHERE queue_size > 0 OR is_readonly = 1 OR absolute_delay > 30
"

# 3. Active queries
echo "3. Long-running queries (> 60s):"
clickhouse-client --query "
SELECT query_id, user, elapsed, query
FROM system.processes
WHERE elapsed > 60
ORDER BY elapsed DESC
"

# 4. Mutations in progress
echo "4. Running mutations:"
clickhouse-client --query "
SELECT database, table, mutation_id, command, parts_to_do, is_done
FROM system.mutations
WHERE is_done = 0
ORDER BY create_time
"

# 5. Disk space (need at least 2x the package size)
echo "5. Available disk space:"
df -h /var/lib/clickhouse /tmp

# 6. Recent errors
echo "6. Recent errors (last 1 hour):"
clickhouse-client --query "
SELECT name, code, value, last_error_message
FROM system.errors
WHERE value > 0 AND last_error_time >= now() - INTERVAL 1 HOUR
ORDER BY value DESC
LIMIT 10
"

echo "=== Pre-patch check complete ==="
```

## Taking a Pre-Patch Backup

Always back up critical tables before patching:

```sql
-- Take a quick freeze snapshot
ALTER TABLE my_database.events FREEZE WITH NAME 'pre-patch-2026-03-31';
```

Freeze creates hardlinks under the data directory's `shadow/` folder. Verify on the filesystem:

```bash
# Inspect the freeze output
sudo ls -la /var/lib/clickhouse/shadow/pre-patch-2026-03-31/
```

Or use a full backup:

```bash
# Create a labeled backup
clickhouse-client --query "
BACKUP DATABASE my_database
TO S3('https://s3.amazonaws.com/your-backup-bucket/clickhouse/pre-patch/2026-03-31/')
SETTINGS async = true;
"

# Wait for completion
clickhouse-client --query "
SELECT status, formatReadableSize(total_size) AS size, error
FROM system.backups
ORDER BY start_time DESC
LIMIT 1;
"
```

## Rolling Update on a Replicated Cluster

For a replicated cluster, update nodes one at a time to maintain availability. ClickHouse replicas can communicate between minor version patch levels.

```bash
#!/bin/bash
# Apply patch to one node at a time

NODES="clickhouse-1 clickhouse-2 clickhouse-3"
NEW_VERSION="24.3.5.46.1"

for NODE in $NODES; do
    echo "=== Patching ${NODE} ==="

    # 1. Wait for replication queue to drain
    echo "Waiting for replication queue to drain..."
    ssh "$NODE" "clickhouse-client --query \"
    SELECT database, table, queue_size
    FROM system.replicas
    WHERE queue_size > 10
    \" "

    # 2. Stop accepting new inserts on this node (optional - depends on client)
    # Your load balancer should route traffic away from this node

    # 3. Wait for active queries to finish
    echo "Waiting for active queries..."
    for i in $(seq 1 12); do
        ACTIVE=$(ssh "$NODE" "clickhouse-client --query 'SELECT count() FROM system.processes'")
        if [ "$ACTIVE" -le 1 ]; then break; fi
        echo "  ${ACTIVE} active queries, waiting 5s..."
        sleep 5
    done

    # 4. Install the patch
    echo "Installing ClickHouse ${NEW_VERSION} on ${NODE}..."
    ssh "$NODE" "
    sudo apt-get update
    sudo apt-get install -y \
      clickhouse-server=${NEW_VERSION} \
      clickhouse-client=${NEW_VERSION} \
      clickhouse-common-static=${NEW_VERSION}
    "

    # 5. Restart the server
    echo "Restarting ClickHouse on ${NODE}..."
    ssh "$NODE" "sudo systemctl restart clickhouse-server"

    # 6. Wait for the server to come back up
    echo "Waiting for ${NODE} to come back up..."
    for i in $(seq 1 30); do
        if ssh "$NODE" "curl -sf http://localhost:8123/ping" > /dev/null 2>&1; then
            echo "  ${NODE} is up"
            break
        fi
        echo "  Waiting (${i}/30)..."
        sleep 10
    done

    # 7. Verify version and replication health
    echo "Verifying ${NODE}..."
    ssh "$NODE" "clickhouse-client --query 'SELECT version()'"
    ssh "$NODE" "clickhouse-client --query \"
    SELECT database, table, is_readonly, absolute_delay
    FROM system.replicas
    WHERE is_readonly = 1 OR absolute_delay > 60
    \""

    echo "=== ${NODE} patched successfully ==="
    echo "Waiting 60s before patching next node..."
    sleep 60
done

echo "=== All nodes patched ==="
```

## Applying a Patch via Package Manager

On a single node or for a simple non-replicated deployment:

```bash
# Update package list
sudo apt-get update

# Check what version will be installed
apt-cache policy clickhouse-server

# Install specific version
sudo apt-get install -y \
  clickhouse-server=24.3.5.46.1 \
  clickhouse-client=24.3.5.46.1 \
  clickhouse-common-static=24.3.5.46.1

# Restart
sudo systemctl restart clickhouse-server

# Verify
clickhouse-client --query "SELECT version()"
```

For RPM-based systems:

```bash
# Download and install RPMs
sudo yum update clickhouse-server clickhouse-client clickhouse-common-static

# Or install specific version
sudo rpm -Uvh \
  https://packages.clickhouse.com/rpm/stable/clickhouse-server-24.3.5.46.1.x86_64.rpm \
  https://packages.clickhouse.com/rpm/stable/clickhouse-client-24.3.5.46.1.x86_64.rpm \
  https://packages.clickhouse.com/rpm/stable/clickhouse-common-static-24.3.5.46.1.x86_64.rpm
```

## Post-Patch Verification

Run a comprehensive health check after each node is patched:

```bash
#!/bin/bash
# /usr/local/bin/clickhouse-post-patch-check.sh

NODE="${1:-localhost}"

echo "=== Post-Patch Verification for ${NODE} ==="

# Version
ssh "$NODE" "clickhouse-client --query 'SELECT version()'"

# HTTP endpoint
ssh "$NODE" "curl -sf http://localhost:8123/ping" && echo "HTTP ping OK"

# Replication health
ssh "$NODE" "clickhouse-client --query \"
SELECT
    database, table,
    is_readonly,
    queue_size,
    absolute_delay,
    last_queue_update
FROM system.replicas
ORDER BY absolute_delay DESC
LIMIT 10
\""

# Recent errors
ssh "$NODE" "clickhouse-client --query \"
SELECT name, value, last_error_message
FROM system.errors
WHERE value > 0 AND last_error_time >= now() - INTERVAL 30 MINUTE
ORDER BY value DESC
LIMIT 10
\""

# Test query
ssh "$NODE" "clickhouse-client --query 'SELECT count() FROM system.tables'"
echo "Test query OK"

echo "=== Verification complete ==="
```

## Summary

Applying ClickHouse security patches safely requires: identifying the patch version from GitHub or the package repository, running a pre-patch checklist to confirm no replication lag or long-running mutations, taking a freeze snapshot or full backup, applying the patch to one replica at a time using a rolling update that waits for replication queue drainage before proceeding to the next node, and running a post-patch health check to verify the version, replication status, and absence of new errors. Never patch all replicas simultaneously; the rolling approach ensures at least one healthy copy of each table is always available.
