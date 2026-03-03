# How to Copy etcd Snapshots Directly from Talos Nodes

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, etcd, Snapshot, Backup, Kubernetes, Data Transfer

Description: Learn how to copy etcd snapshot files directly from Talos Linux nodes to your local machine or remote storage for backup purposes.

---

Talos Linux does not provide SSH access, so you cannot simply SCP files off the nodes. Getting etcd snapshots off a Talos node requires using the Talos API through `talosctl`. This guide covers the different methods for copying etcd snapshots from your Talos nodes, including direct downloads, streaming to remote storage, and handling large snapshots.

## The Basic Approach: talosctl etcd snapshot

The primary way to get an etcd snapshot from a Talos node is the `talosctl etcd snapshot` command:

```bash
# Download an etcd snapshot to your local machine
talosctl etcd snapshot ./my-etcd-backup.db --nodes <control-plane-ip>

# The file is saved on the machine running talosctl,
# NOT on the Talos node itself
```

This command tells the etcd instance on the specified node to create a snapshot and then streams the snapshot data back to your local machine through the Talos API. The snapshot is never written to disk on the Talos node (since the filesystem is read-only and ephemeral storage is limited).

## Understanding What Happens During Snapshot

When you run `talosctl etcd snapshot`, the following occurs:

1. `talosctl` connects to the Talos API on the specified node
2. The Talos API calls etcd's snapshot API
3. etcd creates a consistent point-in-time snapshot of the database
4. The snapshot data is streamed through the Talos API to your `talosctl` client
5. `talosctl` writes the data to the specified local file

```bash
# You can target any control plane node for the snapshot
# The snapshot contains the full etcd database regardless
# of which member you connect to
talosctl etcd snapshot ./backup.db --nodes 10.0.0.1

# Or use a different control plane node
talosctl etcd snapshot ./backup.db --nodes 10.0.0.2

# Both produce identical snapshots (assuming no writes
# happened between the two commands)
```

## Copying to Remote Storage

In most production setups, you want to send the snapshot directly to remote storage rather than keeping it on your local machine.

### Streaming to S3

```bash
# Snapshot to local file, then upload
talosctl etcd snapshot /tmp/etcd-backup.db --nodes <cp-node>
aws s3 cp /tmp/etcd-backup.db s3://my-backups/etcd/backup-$(date +%Y%m%d-%H%M%S).db
rm /tmp/etcd-backup.db

# Or use a pipe (if supported by your tools)
# Note: talosctl etcd snapshot requires a file path,
# so piping is not directly supported
```

### Streaming to GCS

```bash
# Snapshot and upload to Google Cloud Storage
talosctl etcd snapshot /tmp/etcd-backup.db --nodes <cp-node>
gsutil cp /tmp/etcd-backup.db gs://my-backups/etcd/backup-$(date +%Y%m%d-%H%M%S).db
rm /tmp/etcd-backup.db
```

### Streaming to Azure Blob Storage

```bash
# Snapshot and upload to Azure
talosctl etcd snapshot /tmp/etcd-backup.db --nodes <cp-node>
az storage blob upload \
  --account-name mystorageaccount \
  --container-name etcd-backups \
  --name backup-$(date +%Y%m%d-%H%M%S).db \
  --file /tmp/etcd-backup.db
rm /tmp/etcd-backup.db
```

## Reading Other Files from Talos Nodes

While the etcd snapshot has its own dedicated command, you can also read files from Talos nodes using `talosctl read`:

```bash
# Read a file from a Talos node
talosctl read /var/log/messages --nodes <node-ip> > messages.log

# Read the etcd data directory listing
talosctl ls /var/lib/etcd --nodes <cp-node>

# Note: You should NOT try to copy raw etcd files for backup
# Always use the snapshot API for consistent backups
```

The `talosctl read` command can copy any file from the Talos node's filesystem, but for etcd backups, always use `talosctl etcd snapshot`. Copying raw etcd files while etcd is running gives you an inconsistent copy that may be unusable for recovery.

## Handling Large Snapshots

For clusters with large etcd databases, the snapshot transfer can take time and bandwidth:

```bash
# Check your etcd database size before snapshotting
talosctl etcd status --nodes <cp-node>

# For large databases (100MB+), the transfer may take
# a while over slow connections

# Consider compressing after download
talosctl etcd snapshot /tmp/etcd-backup.db --nodes <cp-node>
gzip /tmp/etcd-backup.db
# Result: /tmp/etcd-backup.db.gz

# etcd snapshots compress well - typically 50-70% size reduction
ls -lh /tmp/etcd-backup.db.gz
```

## Snapshot Script with Error Handling

A production-ready script for copying etcd snapshots:

```bash
#!/bin/bash
# copy-etcd-snapshot.sh
set -e

# Configuration
CP_NODES=("10.0.0.1" "10.0.0.2" "10.0.0.3")
LOCAL_DIR="/tmp/etcd-snapshots"
REMOTE_BUCKET="s3://my-backups/etcd"
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
SNAPSHOT_FILE="${LOCAL_DIR}/etcd-${TIMESTAMP}.db"

mkdir -p ${LOCAL_DIR}

# Try each control plane node until one succeeds
SNAPSHOT_TAKEN=false
for node in "${CP_NODES[@]}"; do
    echo "Attempting snapshot from ${node}..."

    if talosctl etcd snapshot ${SNAPSHOT_FILE} --nodes ${node} 2>/dev/null; then
        echo "Snapshot successful from ${node}"
        SNAPSHOT_TAKEN=true
        break
    else
        echo "Failed to snapshot from ${node}, trying next node..."
    fi
done

if [ "${SNAPSHOT_TAKEN}" = false ]; then
    echo "ERROR: Could not take snapshot from any control plane node"
    exit 1
fi

# Verify the snapshot
FILESIZE=$(stat -c%s "${SNAPSHOT_FILE}" 2>/dev/null || stat -f%z "${SNAPSHOT_FILE}")
if [ "${FILESIZE}" -lt 1000 ]; then
    echo "ERROR: Snapshot file is too small (${FILESIZE} bytes)"
    rm -f ${SNAPSHOT_FILE}
    exit 1
fi

echo "Snapshot size: ${FILESIZE} bytes"

# Compress
gzip ${SNAPSHOT_FILE}
COMPRESSED_FILE="${SNAPSHOT_FILE}.gz"

# Upload to remote storage
echo "Uploading to ${REMOTE_BUCKET}..."
aws s3 cp ${COMPRESSED_FILE} \
  ${REMOTE_BUCKET}/etcd-${TIMESTAMP}.db.gz \
  --sse aws:kms

echo "Upload complete"

# Clean up local file
rm -f ${COMPRESSED_FILE}

# Clean up old remote backups (keep last 168 = 7 days of hourly)
echo "Cleaning up old remote backups..."
aws s3 ls ${REMOTE_BUCKET}/ | \
  sort | head -n -168 | \
  awk '{print $4}' | \
  xargs -I {} aws s3 rm ${REMOTE_BUCKET}/{}

echo "Done!"
```

## Copying Snapshots Between Environments

Sometimes you need to copy a snapshot from production to a staging environment for testing:

```bash
# Take a snapshot from production
talosctl etcd snapshot ./prod-snapshot.db \
  --nodes <prod-cp-node> \
  --talosconfig ./prod-talosconfig

# Use it to bootstrap a staging cluster
talosctl bootstrap --nodes <staging-cp-node> \
  --recover-from ./prod-snapshot.db \
  --talosconfig ./staging-talosconfig
```

Be careful when doing this - the production snapshot contains all secrets, certificates, and sensitive data from the production cluster.

## Verifying Copied Snapshots

Always verify that the snapshot you copied is valid:

```bash
# If you have etcdctl installed
etcdctl snapshot status ./etcd-backup.db --write-out=table

# Expected output:
# +----------+----------+------------+------------+
# |   HASH   | REVISION | TOTAL KEYS | TOTAL SIZE |
# +----------+----------+------------+------------+
# | 3b35a8f7 |   142356 |       1247 |   12 MB    |
# +----------+----------+------------+------------+

# Check for corruption
etcdctl snapshot status ./etcd-backup.db --write-out=json | jq .
```

If you do not have etcdctl, at minimum check the file size and compare it against the expected database size from `talosctl etcd status`.

## Network Considerations

The snapshot data travels from the Talos node to your machine through the Talos API (port 50000 by default). For large snapshots or slow networks:

```bash
# Check network throughput to the node
# The snapshot transfer speed depends on this bandwidth

# For remote clusters, consider running the backup script
# on a machine close to the cluster (same network/region)
# to minimize transfer time

# If you are using a VPN or bastion host, ensure the
# connection is stable during the transfer
```

## Summary

Copying etcd snapshots from Talos Linux nodes is done through `talosctl etcd snapshot`, which streams the data through the Talos API. For production use, combine this with scripts that handle error recovery (trying multiple control plane nodes), compression, remote storage upload, retention management, and verification. Always verify your snapshots after copying them, and test the restore process regularly to make sure the snapshots are usable when you need them most.
