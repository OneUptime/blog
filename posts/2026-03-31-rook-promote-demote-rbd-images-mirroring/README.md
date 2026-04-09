# How to Promote and Demote RBD Images in Mirroring

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, RBD, Mirroring, Failover, Disaster Recovery

Description: Learn how to promote and demote RBD images during mirroring failover and failback operations in Ceph for controlled disaster recovery workflows.

---

## Overview

In RBD mirroring, each image has a primary and non-primary (secondary) designation. The primary cluster accepts writes; the secondary receives replicated data and is read-only. Promoting and demoting images is how you change which cluster is the primary, enabling planned failover and failback operations.

## Understanding Primary vs. Non-Primary

- **Primary image** - accepts reads and writes, replicates changes to secondary
- **Non-primary image** - receives mirrored data, read-only unless promoted

```bash
# Check current primary status
rbd info replicapool/myimage
# Shows: mirroring state: enabled, mirroring primary: true/false
```

## Planned Failover (Graceful Demotion + Promotion)

For a planned failover, first demote the primary gracefully. This ensures all data is flushed before the secondary takes over.

On the primary cluster:

```bash
# Demote the image on the primary
rbd mirror image demote replicapool/myimage

# Verify state changes to non-primary
rbd info replicapool/myimage
```

Wait for replication to complete on the secondary:

```bash
# On the secondary cluster, wait for replaying to catch up
rbd mirror image status replicapool/myimage
# Wait until status description shows: entries_behind_primary=0
```

Then promote on the secondary:

```bash
# On the secondary cluster
rbd mirror image promote replicapool/myimage

# Verify the secondary is now primary
rbd info replicapool/myimage
```

## Forced Promotion (Unplanned Failover)

When the primary cluster is unavailable, force-promote on the secondary:

```bash
# Force promote - may result in data loss
rbd mirror image promote --force replicapool/myimage
```

The `--force` flag skips the requirement that the previous primary has been demoted. This can cause split-brain if the original primary recovers.

## Pool-Level Promotion and Demotion

For pools with many images, operate at the pool level:

```bash
# Demote all images in a pool (primary cluster)
rbd mirror pool demote replicapool

# Promote all images in a pool (secondary cluster)
rbd mirror pool promote replicapool

# Force-promote all images
rbd mirror pool promote --force replicapool
```

## Rook: Managing Promotion via Toolbox

In Rook, use the toolbox pod for promote/demote operations:

```bash
TOOLBOX=$(kubectl -n rook-ceph get pod -l app=rook-ceph-tools \
  -o jsonpath='{.items[0].metadata.name}')

# Demote on primary cluster
kubectl -n rook-ceph exec -it $TOOLBOX -- \
  rbd mirror pool demote replicapool

# On the secondary cluster's toolbox
kubectl -n rook-ceph exec -it $TOOLBOX -- \
  rbd mirror pool promote replicapool
```

## Post-Promotion Steps

After promoting the secondary:

```bash
# Update application connection strings to point to new cluster
# Check that all PVCs using the pool are functional
kubectl get pvc --all-namespaces | grep mirrored

# After original primary recovers, re-enable it as secondary
# On the recovered cluster, demote is automatic if the new primary
# is replicating back
```

## Summary

Promoting and demoting RBD images controls which cluster serves as the active primary in a mirroring setup. Use graceful demotion followed by promotion for planned failovers with zero data loss. For unplanned scenarios, forced promotion on the secondary gets workloads running quickly at the risk of split-brain. Always verify mirror status after each operation.
