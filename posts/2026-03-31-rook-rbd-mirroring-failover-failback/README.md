# How to Perform RBD Mirroring Failover and Failback

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, RBD, Mirroring, Failover, Disaster Recovery

Description: Learn how to perform controlled failover and failback with RBD mirroring in Ceph, including step-by-step procedures for both planned and unplanned scenarios.

---

## Overview

Failover in RBD mirroring means promoting the secondary cluster to primary so workloads can continue running after the primary fails. Failback is the reverse - returning operations to the original primary after it recovers. Both operations require careful sequencing to minimize data loss and avoid split-brain conditions.

## Planned Failover

Use a planned failover when you need to migrate workloads for maintenance.

**On the primary cluster:**

```bash
# Step 1: Pause all workloads writing to mirrored volumes
kubectl scale deployment myapp --replicas=0

# Step 2: Demote all images in the pool
rbd mirror pool demote replicapool

# Verify demotion
rbd mirror pool status replicapool --verbose
```

**On the secondary cluster:**

```bash
# Step 3: Wait for replication to catch up
watch rbd mirror pool status replicapool
# Wait until all images show entries_behind_primary=0

# Step 4: Promote all images
rbd mirror pool promote replicapool

# Step 5: Start workloads on the secondary cluster
kubectl scale deployment myapp --replicas=3
```

## Unplanned Failover (Emergency)

When the primary is unavailable:

```bash
# On the secondary cluster
# Force promote all images (may lose recent writes)
rbd mirror pool promote --force replicapool

# Start workloads
kubectl scale deployment myapp --replicas=3
```

## Failback Procedure

After the original primary recovers, return operations to it.

**On the current primary (previously secondary):**

```bash
# Step 1: Pause workloads
kubectl scale deployment myapp --replicas=0

# Step 2: Demote (graceful)
rbd mirror pool demote replicapool
```

**On the recovered original primary:**

```bash
# Step 3: Wait for mirror sync from current primary
watch rbd mirror pool status replicapool
# Wait for all images to show entries_behind_primary=0

# Step 4: Promote the original primary
rbd mirror pool promote replicapool

# Step 5: Resume workloads on the original primary
kubectl scale deployment myapp --replicas=3
```

## Rook: Failover Workflow

In a Rook environment, manage failover using the toolbox:

```bash
PRIMARY_TOOLBOX=$(kubectl -n rook-ceph get pod -l app=rook-ceph-tools \
  -o jsonpath='{.items[0].metadata.name}')

# Demote on primary cluster
kubectl -n rook-ceph exec -it $PRIMARY_TOOLBOX -- \
  rbd mirror pool demote replicapool

# Get the toolbox pod name on the secondary cluster
SECONDARY_TOOLBOX=$(kubectl --context secondary-cluster -n rook-ceph get pod \
  -l app=rook-ceph-tools -o jsonpath='{.items[0].metadata.name}')

# Promote on secondary cluster
kubectl --context secondary-cluster -n rook-ceph exec -it $SECONDARY_TOOLBOX -- \
  rbd mirror pool promote replicapool
```

## Verifying After Failover

```bash
# Check all images show as primary on the promoted cluster
rbd mirror pool status replicapool --verbose

# Confirm application is functioning
kubectl get pods
kubectl exec -it myapp-pod -- db-check.sh
```

## Automating with a Failover Script

```bash
#!/bin/bash
# failover.sh - Run on secondary cluster
set -e

POOL="${1:-replicapool}"
echo "Initiating failover for pool: $POOL"

echo "Force promoting all images..."
rbd mirror pool promote --force $POOL

echo "Failover complete. Verify status:"
rbd mirror pool status $POOL --verbose
```

## Summary

RBD mirroring failover involves demoting the primary and promoting the secondary in sequence. Planned failovers can achieve zero data loss by waiting for full replication before promotion. Unplanned failovers use forced promotion and may lose recent writes. Failback follows the same sequence in reverse. Always verify application health and mirror status after completing either operation.
