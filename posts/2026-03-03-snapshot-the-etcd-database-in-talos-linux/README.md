# How to Snapshot the etcd Database in Talos Linux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, etcd, Backups, Kubernetes, Cluster Management, Disaster Recovery

Description: Learn how to take etcd snapshots in Talos Linux to protect your Kubernetes cluster state and enable disaster recovery.

---

The etcd database is the backbone of every Kubernetes cluster. It stores all cluster state - every resource definition, every secret, every configuration. If etcd is lost and you do not have a backup, your cluster state is gone. Taking regular etcd snapshots in Talos Linux is one of the most important operational tasks you can perform.

## Why etcd Snapshots Matter

Unlike application data stored in persistent volumes, etcd data represents the control plane state of your cluster. This includes:

- All Kubernetes resources (Deployments, Services, ConfigMaps, Secrets, etc.)
- RBAC policies and service accounts
- Custom resource definitions and their instances
- Namespace configurations
- Cluster-wide settings

Losing etcd means losing the ability to manage your cluster. Even if your application pods keep running temporarily, you cannot deploy, scale, or manage anything without etcd.

## Taking a Snapshot with talosctl

Talos provides a straightforward command for taking etcd snapshots:

```bash
# Take an etcd snapshot from a control plane node
talosctl etcd snapshot ./etcd-snapshot.db --nodes <control-plane-ip>

# The snapshot file is saved to your local machine
# (the machine running talosctl, not the Talos node)
```

This command connects to the etcd instance on the specified control plane node, triggers a snapshot, and downloads the resulting file to your local filesystem.

### Choosing Which Node to Snapshot

You can take a snapshot from any control plane node. The snapshot will contain the full etcd database regardless of which member you connect to, because etcd replicates data across all members.

```bash
# Check which control plane nodes are available
talosctl etcd members --nodes <any-control-plane-ip>

# Take the snapshot from any healthy member
# Prefer taking it from a follower rather than the leader
# to minimize impact on cluster operations
talosctl etcd status --nodes <any-control-plane-ip>
```

## Verifying the Snapshot

After taking a snapshot, verify it is valid:

```bash
# Check the file size - it should not be zero
ls -la ./etcd-snapshot.db

# The file size depends on your cluster state
# A small cluster might produce a few MB
# A large cluster could produce hundreds of MB
```

For a more thorough verification, you can use the etcdctl tool:

```bash
# If you have etcdctl installed
etcdctl snapshot status ./etcd-snapshot.db --write-out=table

# Expected output shows:
# HASH, REVISION, TOTAL KEYS, TOTAL SIZE
# All values should be non-zero
```

If you do not have etcdctl installed locally, you can verify the snapshot by attempting a restore in a test environment (more on this in the recovery section).

## Naming and Organizing Snapshots

Use a consistent naming scheme that includes the timestamp and cluster name:

```bash
# Good naming convention
CLUSTER_NAME="production"
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
SNAPSHOT_FILE="etcd-${CLUSTER_NAME}-${TIMESTAMP}.db"

talosctl etcd snapshot ./${SNAPSHOT_FILE} --nodes <control-plane-ip>

echo "Snapshot saved: ${SNAPSHOT_FILE}"
# Output: Snapshot saved: etcd-production-20260303-143022.db
```

Organize snapshots in a directory structure:

```bash
# Directory structure for snapshots
backups/
  etcd/
    production/
      etcd-production-20260301-060000.db
      etcd-production-20260302-060000.db
      etcd-production-20260303-060000.db
    staging/
      etcd-staging-20260303-060000.db
```

## Storing Snapshots Safely

The snapshot file contains your entire cluster state, including Kubernetes Secrets (which may contain database passwords, API keys, TLS certificates, etc.). Treat it as sensitive data.

```bash
# Encrypt the snapshot before storing
gpg --symmetric --cipher-algo AES256 \
  --output ${SNAPSHOT_FILE}.gpg ${SNAPSHOT_FILE}

# Remove the unencrypted version
rm ${SNAPSHOT_FILE}

# Upload to secure storage
aws s3 cp ${SNAPSHOT_FILE}.gpg \
  s3://my-backups/etcd/${SNAPSHOT_FILE}.gpg \
  --sse aws:kms
```

Store snapshots in at least two different locations:

- Object storage (S3, GCS, Azure Blob)
- A different physical location or region
- Never store them only on the cluster itself

## Snapshot Size and Performance

Taking a snapshot is a read operation that creates a consistent copy of the etcd database. On a healthy cluster, this has minimal impact on performance.

```bash
# Check etcd database size before snapshotting
talosctl etcd status --nodes <control-plane-ip>

# The DB SIZE column shows the current database size
# Snapshots will be approximately this size
```

For very large etcd databases (hundreds of MB), the snapshot operation might take a few seconds longer. During this time, etcd might show slightly higher latency for write operations.

## Compacting etcd Before Snapshotting

If your etcd database has grown large due to historical revisions, compacting it before taking a snapshot can reduce the snapshot size:

```bash
# Check current database size
talosctl etcd status --nodes <control-plane-ip>

# etcd auto-compacts in Talos, but you can check
# the compaction status in the logs
talosctl logs etcd --nodes <control-plane-ip> | grep compact
```

Talos configures etcd with auto-compaction by default, so manual compaction is rarely needed. But if your database is unusually large, it is worth investigating.

## Snapshot Retention

Decide on a retention policy based on your recovery requirements:

```bash
# Example retention policy:
# - Keep hourly snapshots for the last 24 hours
# - Keep daily snapshots for the last 30 days
# - Keep weekly snapshots for the last 3 months
# - Keep monthly snapshots for the last year

# Clean up old snapshots
find ./backups/etcd/ -name "*.db" -mtime +30 -delete
find ./backups/etcd/ -name "*.db.gpg" -mtime +30 -delete
```

The right retention depends on your recovery time objective (RTO) and recovery point objective (RPO). If you can tolerate losing up to one hour of cluster state changes, hourly snapshots are sufficient.

## Quick Reference Script

Here is a complete snapshot script you can use as a starting point:

```bash
#!/bin/bash
# etcd-snapshot.sh - Take and store an etcd snapshot

set -e

# Configuration
CLUSTER_NAME="${1:-production}"
CP_NODE="${2:-10.0.0.1}"
BACKUP_DIR="./backups/etcd/${CLUSTER_NAME}"
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
SNAPSHOT_FILE="${BACKUP_DIR}/etcd-${CLUSTER_NAME}-${TIMESTAMP}.db"
RETENTION_DAYS=30

# Create backup directory
mkdir -p ${BACKUP_DIR}

# Pre-check: verify etcd is healthy
echo "Checking etcd health..."
talosctl etcd status --nodes ${CP_NODE}

# Take the snapshot
echo "Taking etcd snapshot..."
talosctl etcd snapshot ${SNAPSHOT_FILE} --nodes ${CP_NODE}

# Verify the snapshot
FILESIZE=$(stat -f%z "${SNAPSHOT_FILE}" 2>/dev/null || stat -c%s "${SNAPSHOT_FILE}")
if [ "${FILESIZE}" -lt 1000 ]; then
    echo "ERROR: Snapshot file is suspiciously small (${FILESIZE} bytes)"
    exit 1
fi

echo "Snapshot saved: ${SNAPSHOT_FILE} (${FILESIZE} bytes)"

# Clean up old snapshots
echo "Cleaning up snapshots older than ${RETENTION_DAYS} days..."
find ${BACKUP_DIR} -name "*.db" -mtime +${RETENTION_DAYS} -delete

echo "Done!"
```

```bash
# Usage
chmod +x etcd-snapshot.sh
./etcd-snapshot.sh production 10.0.0.1
```

## Summary

Taking etcd snapshots in Talos Linux is a simple operation with `talosctl etcd snapshot`, but the practices around it - naming, storage, encryption, retention, and verification - are what make the difference between a backup that saves you and one that does not. Make snapshots a regular part of your cluster operations, store them securely in multiple locations, and test your restore procedure periodically to make sure it actually works when you need it.
