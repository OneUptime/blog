# How to Handle Split-Brain Scenarios in RBD Mirroring

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, RBD, Mirroring, Split-Brain, Disaster Recovery

Description: Learn how to detect, prevent, and resolve split-brain scenarios in RBD mirroring where both clusters have promoted to primary simultaneously.

---

## Overview

A split-brain in RBD mirroring occurs when two cluster peers both believe they are the primary for the same image - typically after a forced promotion on the secondary while the original primary is still running. This results in divergent write histories and requires manual resolution to restore a consistent mirroring relationship.

## Detecting Split-Brain

The rbd-mirror daemon reports split-brain images with a specific error state:

```bash
# Check pool mirror status
rbd mirror pool status replicapool --verbose

# Check individual image
rbd mirror image status replicapool/myimage

# Split-brain shows as:
# state: up+error
# description: split-brain
```

## How Split-Brain Occurs

1. Network partition between primary and secondary
2. Operator force-promotes the secondary: `rbd mirror image promote --force`
3. Network is restored - both clusters have divergent write histories
4. rbd-mirror detects both as primary and enters error state

## Resolving Split-Brain: Choosing a Winner

You must choose which cluster's data to keep. This involves demoting one side and forcing resync:

```bash
# Step 1: Decide which cluster to keep (e.g., keep cluster-B's data)

# Step 2: On cluster-A (the one you will discard), demote the image
rbd mirror image demote replicapool/myimage

# Step 3: On cluster-A, force resync from cluster-B (now primary)
rbd mirror image resync replicapool/myimage
```

Alternatively, if you want to keep cluster-A's data:

```bash
# On cluster-B, demote forcefully
rbd mirror image demote replicapool/myimage

# On cluster-A, re-establish it as primary
rbd mirror image promote replicapool/myimage

# Force cluster-B to resync from cluster-A
# On cluster-B:
rbd mirror image resync replicapool/myimage
```

## Preventing Split-Brain

Implement safeguards to reduce split-brain risk:

```bash
# Use automated demotion before forcing promotion where possible
# Monitor replication lag before triggering manual failovers
rbd mirror image status replicapool/myimage --format json | \
  jq '.description | test("entries_behind_primary=0")'
```

Use network fencing (STONITH) to ensure the original primary is truly offline before force-promoting.

## Rook: Handling Split-Brain via CRD

In Rook, check the CephBlockPool mirroring status:

```bash
kubectl -n rook-ceph describe CephBlockPool replicapool | grep -A 10 "Mirroring"

# Use toolbox for rbd commands
TOOLBOX=$(kubectl -n rook-ceph get pod -l app=rook-ceph-tools \
  -o jsonpath='{.items[0].metadata.name}')

kubectl -n rook-ceph exec -it $TOOLBOX -- \
  rbd mirror pool status replicapool --verbose
```

Rook also reports mirroring health via the CephCluster status:

```bash
kubectl -n rook-ceph get CephBlockPool replicapool -o yaml | \
  grep -A 20 "mirroringStatus"
```

## Post-Resolution Verification

After resolving split-brain, confirm healthy mirroring state:

```bash
# Check that the image is no longer in split-brain
rbd mirror image status replicapool/myimage

# Verify replication is progressing
watch rbd mirror image status replicapool/myimage
# Should show: up+replaying with entries_behind_primary decreasing
```

## Summary

Split-brain in RBD mirroring occurs when both clusters are simultaneously primary due to forced promotion. Resolution requires choosing which cluster's data to keep, demoting the other, and optionally forcing a resync. Prevention relies on proper network fencing and avoiding force-promotion when the primary is still running. Always verify image states return to `up+replaying` after resolution.
