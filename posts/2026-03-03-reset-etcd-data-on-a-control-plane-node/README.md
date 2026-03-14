# How to Reset etcd Data on a Control Plane Node

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, etcd, Control Plane, Kubernetes, Cluster Recovery

Description: A detailed guide to resetting etcd data on Talos Linux control plane nodes, including safe removal, recovery from corruption, and rebuilding etcd membership.

---

etcd is the backbone of every Kubernetes cluster. It stores all cluster state, including pod definitions, service accounts, secrets, and configuration maps. On Talos Linux, etcd runs as a system service on control plane nodes, and its data lives on the EPHEMERAL partition. When etcd data becomes corrupted, a node falls out of sync, or you need to rebuild a control plane node, knowing how to safely reset etcd is critical.

This guide covers the procedures for resetting etcd data on Talos Linux control plane nodes, from routine member replacement to emergency recovery.

## How etcd Works on Talos Linux

On Talos Linux, etcd is managed as a core system service, not as a Kubernetes pod. This means it starts before the Kubernetes API server and operates independently of the pod lifecycle. Each control plane node runs one etcd member, and together they form a cluster.

The etcd data directory lives on the EPHEMERAL partition at `/var/lib/etcd`. This directory contains the WAL (Write-Ahead Log) files, snapshot files, and the main database file.

```bash
# Check etcd status on a control plane node
talosctl service etcd --nodes 10.0.0.10

# List etcd members
talosctl etcd members --nodes 10.0.0.10

# Check etcd health
talosctl etcd status --nodes 10.0.0.10
```

## Safely Removing an etcd Member

Before resetting etcd data on a node, you must remove it from the etcd cluster. Failing to do this leaves the cluster with a member it cannot reach, which counts against quorum.

```bash
# Step 1: Identify the member to remove
talosctl etcd members --nodes 10.0.0.10

# Output shows member IDs, names, and peer URLs
# MEMBER ID         NAME        PEER URLS
# 8e9e05c52164694d  node-10     https://10.0.0.10:2380
# a1b2c3d4e5f6g7h8  node-11     https://10.0.0.11:2380
# i9j0k1l2m3n4o5p6  node-12     https://10.0.0.12:2380

# Step 2: Remove the member from the etcd cluster
# Execute this from a DIFFERENT healthy control plane node
talosctl etcd remove-member --nodes 10.0.0.11 8e9e05c52164694d

# Step 3: Verify the member was removed
talosctl etcd members --nodes 10.0.0.11
```

Important: Always execute the remove-member command from a healthy node that is NOT the one being removed.

## Resetting etcd by Wiping the EPHEMERAL Partition

The most straightforward way to reset etcd data is to wipe the EPHEMERAL partition, which is where etcd stores its data:

```bash
# First, remove the etcd member from the cluster (from another node)
talosctl etcd remove-member --nodes 10.0.0.11 <member-id>

# Delete the Kubernetes node object
kubectl delete node node-to-reset

# Reset only the EPHEMERAL partition on the target node
talosctl reset --nodes 10.0.0.10 \
  --graceful=false \
  --reboot=true \
  --system-labels-to-wipe EPHEMERAL
```

After the node reboots, it retains its machine configuration (from the STATE partition) and automatically attempts to join the etcd cluster as a new member. Because the etcd data directory is empty, it performs a fresh join.

## Recovering from etcd Corruption

etcd data can become corrupted due to disk failures, power outages, or software bugs. Symptoms include:

- etcd service failing to start with "database file corrupt" errors
- etcd running but returning inconsistent data
- The Kubernetes API server unable to connect to etcd

### Diagnosing Corruption

```bash
# Check etcd service status
talosctl service etcd --nodes 10.0.0.10

# View etcd logs for error messages
talosctl logs etcd --nodes 10.0.0.10

# Look for specific corruption indicators
talosctl logs etcd --nodes 10.0.0.10 | grep -i "corrupt\|panic\|fatal"
```

### Single Member Corruption

If only one etcd member is corrupt and the cluster still has quorum (at least 2 of 3 members are healthy):

```bash
# Remove the corrupt member
talosctl etcd remove-member --nodes 10.0.0.11 <corrupt-member-id>

# Reset the EPHEMERAL partition on the corrupt node
talosctl reset --nodes 10.0.0.10 \
  --graceful=false \
  --reboot=true \
  --system-labels-to-wipe EPHEMERAL

# After reboot, the node will rejoin with fresh etcd data
# It automatically syncs state from the healthy members
```

### Majority Corruption (Quorum Loss)

If the majority of etcd members are corrupt and the cluster has lost quorum, you need to restore from a snapshot or bootstrap from scratch:

```bash
# Check if any member has a valid snapshot
# Talos automatically creates etcd snapshots
talosctl etcd snapshot --nodes 10.0.0.11 /tmp/etcd-snapshot.db

# If you have a snapshot, you can use it to bootstrap a new cluster
# First, reset all control plane nodes
for node in 10.0.0.10 10.0.0.11 10.0.0.12; do
  talosctl reset --nodes "${node}" \
    --graceful=false \
    --reboot=true \
    --system-labels-to-wipe EPHEMERAL
done

# Bootstrap the first node
talosctl apply-config --insecure --nodes 10.0.0.10 --file controlplane.yaml
talosctl bootstrap --nodes 10.0.0.10

# Then add the other control plane nodes
talosctl apply-config --insecure --nodes 10.0.0.11 --file controlplane.yaml
talosctl apply-config --insecure --nodes 10.0.0.12 --file controlplane.yaml
```

## Replacing a Control Plane Node

When you need to completely replace a control plane node (new hardware, different IP address, etc.):

```bash
# Step 1: Remove the old etcd member
talosctl etcd remove-member --nodes 10.0.0.11 <old-member-id>

# Step 2: Delete the old Kubernetes node
kubectl delete node old-node-name

# Step 3: Reset the old node (optional, if reusing hardware)
talosctl reset --nodes 10.0.0.10 \
  --graceful=false \
  --reboot=true

# Step 4: Provision the new node
talosctl apply-config --insecure \
  --nodes 10.0.0.13 \
  --file controlplane.yaml

# Step 5: Verify the new member joined
talosctl etcd members --nodes 10.0.0.11
```

## etcd Defragmentation

Over time, etcd accumulates deleted data that fragments the database file. Defragmentation reclaims this space:

```bash
# Check database size before defragmentation
talosctl etcd status --nodes 10.0.0.10

# Defragment a specific member
talosctl etcd defrag --nodes 10.0.0.10

# Defragment all members one at a time
for node in 10.0.0.10 10.0.0.11 10.0.0.12; do
  echo "Defragmenting ${node}..."
  talosctl etcd defrag --nodes "${node}"
  sleep 5  # Brief pause between defragmentations
done
```

Defragment regularly, especially in clusters with high churn (frequent pod creation and deletion).

## Taking etcd Snapshots

Before any major operation, take a snapshot:

```bash
# Take an etcd snapshot
talosctl etcd snapshot --nodes 10.0.0.10 ./etcd-backup-$(date +%Y%m%d).db

# Verify the snapshot
ls -lh ./etcd-backup-*.db
```

Automate snapshot collection for disaster recovery:

```bash
#!/bin/bash
# etcd-backup.sh - automated etcd backups
BACKUP_DIR="/backups/etcd"
RETENTION_DAYS=30
CONTROL_PLANE_NODE="10.0.0.10"

mkdir -p "${BACKUP_DIR}"

# Take snapshot
BACKUP_FILE="${BACKUP_DIR}/etcd-$(date +%Y%m%d-%H%M%S).db"
talosctl etcd snapshot --nodes "${CONTROL_PLANE_NODE}" "${BACKUP_FILE}"

# Verify the snapshot was created
if [ -s "${BACKUP_FILE}" ]; then
  echo "Backup successful: ${BACKUP_FILE} ($(du -h ${BACKUP_FILE} | cut -f1))"
else
  echo "ERROR: Backup file is empty or missing"
  exit 1
fi

# Clean up old backups
find "${BACKUP_DIR}" -name "etcd-*.db" -mtime +${RETENTION_DAYS} -delete
```

## Monitoring etcd Health

Set up regular health checks to catch problems before they require a reset:

```bash
# Quick health check script
#!/bin/bash
CONTROL_PLANE_NODES=("10.0.0.10" "10.0.0.11" "10.0.0.12")

for node in "${CONTROL_PLANE_NODES[@]}"; do
  status=$(talosctl etcd status --nodes "${node}" 2>&1)
  if echo "${status}" | grep -q "error"; then
    echo "UNHEALTHY: ${node}"
    echo "${status}"
  else
    echo "HEALTHY: ${node}"
  fi
done

# Check cluster-wide etcd alarms
talosctl etcd alarm list --nodes 10.0.0.10
```

## Wrapping Up

Resetting etcd data on Talos Linux control plane nodes is a well-defined procedure, but it requires careful attention to the order of operations. Always remove the etcd member from the cluster before wiping its data. Always maintain quorum during the process. And always take snapshots before making changes. With these practices in place, you can confidently handle etcd member replacement, corruption recovery, and control plane maintenance without risking cluster-wide data loss.
