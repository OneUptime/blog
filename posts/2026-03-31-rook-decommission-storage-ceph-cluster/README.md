# How to Decommission Storage from a Ceph Cluster

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Decommission, OSD, Removal, Storage, Maintenance

Description: Safely remove OSDs, disks, or entire nodes from a running Ceph cluster using proper drain and decommission procedures to avoid data loss or cluster degradation.

---

## Overview

Removing storage from a Ceph cluster requires draining data off the target OSDs before taking them offline. Rook automates much of this process, but understanding the steps ensures safe decommissioning without data loss or extended cluster degradation.

## Before Decommissioning

```bash
kubectl -n rook-ceph exec deploy/rook-ceph-tools -- bash

# Verify cluster has enough free space to absorb the data from removed OSDs
# Data from removed OSDs will redistribute to remaining OSDs
ceph df

# If removing N OSDs, ensure remaining OSDs can hold their data
# Current used: 100 TB, removing 20 TB raw = 7 TB usable (3x)
# Remaining must have 7+ TB free at the 80% threshold
```

## Option 1 - Remove a Single OSD

### Step 1 - Mark OSD Out

```bash
kubectl -n rook-ceph exec deploy/rook-ceph-tools -- \
  ceph osd out osd.5

# This tells Ceph to migrate the OSD's data to other OSDs
# Watch migration progress
watch -n10 "kubectl -n rook-ceph exec deploy/rook-ceph-tools -- ceph status"
```

### Step 2 - Wait for Data Migration

```bash
kubectl -n rook-ceph exec deploy/rook-ceph-tools -- bash

# Monitor until no more PGs are on this OSD
while true; do
  PGS=$(ceph pg ls-by-osd 5 2>/dev/null | wc -l)
  echo "PGs remaining on OSD 5: $PGS"
  [ $PGS -le 1 ] && break
  sleep 30
done
```

### Step 3 - Stop and Remove the OSD

```bash
kubectl -n rook-ceph exec deploy/rook-ceph-tools -- bash

# After all PGs migrated, stop the OSD
ceph osd down osd.5

# Remove from CRUSH map
ceph osd crush remove osd.5

# Delete auth key
ceph auth del osd.5

# Remove from OSD map
ceph osd rm osd.5
```

### Step 4 - Update Rook Configuration

Remove the device from the CephCluster spec:

```yaml
spec:
  storage:
    nodes:
      - name: osd-node-1
        devices:
          - name: sda  # keep
          # sdb removed from spec
```

```bash
kubectl apply -f cephcluster.yaml
```

## Option 2 - Decommission an Entire Node

### Step 1 - Drain All OSDs on the Node

```bash
NODE=osd-node-3

# Get all OSD IDs on the node
kubectl -n rook-ceph exec deploy/rook-ceph-tools -- \
  ceph osd tree | grep $NODE

# Mark all node OSDs out
for OSD in 9 10 11 12; do
  kubectl -n rook-ceph exec deploy/rook-ceph-tools -- \
    ceph osd out osd.$OSD
done
```

### Step 2 - Wait for Full Data Migration

```bash
kubectl -n rook-ceph exec deploy/rook-ceph-tools -- bash

# Monitor all PGs recovering
watch -n30 "ceph status | grep -E 'recovery|misplaced|degraded'"

# Confirm node's OSDs have no PGs
for OSD in 9 10 11 12; do
  PGS=$(ceph pg ls-by-osd $OSD 2>/dev/null | wc -l)
  echo "OSD $OSD has $PGS PGs"
done
```

### Step 3 - Remove Node's OSDs Completely

```bash
kubectl -n rook-ceph exec deploy/rook-ceph-tools -- bash

for OSD in 9 10 11 12; do
  ceph osd down osd.$OSD
  ceph osd crush remove osd.$OSD
  ceph auth del osd.$OSD
  ceph osd rm osd.$OSD
done

# Remove the host from CRUSH
ceph osd crush remove osd-node-3
```

### Step 4 - Remove the Node from Rook and Kubernetes

```yaml
spec:
  storage:
    nodes:
      - name: osd-node-1  # keep
      - name: osd-node-2  # keep
      # osd-node-3 removed
```

```bash
kubectl apply -f cephcluster.yaml

# Drain and remove the Kubernetes node
kubectl drain osd-node-3 --ignore-daemonsets --delete-emptydir-data
kubectl delete node osd-node-3
```

## Step 5 - Clean Up Leftover OSD Pods

```bash
kubectl -n rook-ceph get pods | grep "osd-node-3"
kubectl -n rook-ceph delete pod -l ceph-osd-id=9
```

## Step 6 - Verify Cluster Health After Decommission

```bash
kubectl -n rook-ceph exec deploy/rook-ceph-tools -- bash

# Confirm HEALTH_OK
ceph health

# Verify OSD count
ceph osd stat

# Check data is balanced
ceph osd df | sort -k9 -rn | head -10
```

## Wipe the Decommissioned Disk (Optional)

To reuse the disk elsewhere:

```bash
# On the decommissioned node
sgdisk --zap-all /dev/sdb
dd if=/dev/zero of=/dev/sdb bs=1M count=100
```

## Summary

Decommissioning Ceph storage safely requires marking OSDs out first, waiting for complete data migration, then removing them from the cluster maps. The key requirement is ensuring the remaining cluster has sufficient free capacity to absorb all data from the removed OSDs - failing to check this leads to full-cluster conditions during migration. Rook's declarative configuration makes the process clean: remove the node or device from the spec and apply the change.
