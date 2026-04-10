# How to Understand Delta Synchronization Between RBD Snapshots

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, RBD, Snapshot, Mirroring, Synchronization

Description: Learn how delta synchronization works between RBD snapshots in Ceph, enabling efficient replication by only transferring changed data between snapshot points.

---

## Overview

Delta synchronization in snapshot-based RBD mirroring transfers only the data that changed between two snapshots rather than copying the entire image. This significantly reduces network bandwidth and replication time for large images with small change sets. Understanding how delta sync works helps you optimize snapshot intervals and troubleshoot replication performance.

## How Delta Sync Works

When a new mirror snapshot is created:

1. Ceph calculates the diff between the previous replicated snapshot and the new snapshot
2. Only the changed data blocks are transferred over the network to the secondary
3. The secondary applies the diff to produce an updated copy of the image

The diff calculation uses the `fast-diff` and `object-map` features for efficiency.

```bash
# Ensure fast-diff and object-map are enabled for efficient delta sync
rbd info replicapool/myimage | grep features
# Should include: object-map, fast-diff
```

## Enabling Features Required for Delta Sync

```bash
# Enable object-map and fast-diff on an existing image
rbd feature enable replicapool/myimage object-map
rbd feature enable replicapool/myimage fast-diff

# Rebuild object map after enabling (for existing images)
rbd object-map rebuild replicapool/myimage
```

## Calculating Diffs Manually

You can inspect what would be transferred between two snapshots:

```bash
# Create two snapshots
rbd snap create replicapool/myimage@snap1
# ... workload runs ...
rbd snap create replicapool/myimage@snap2

# Show diff between snapshots (outputs changed extents)
rbd diff replicapool/myimage@snap2 --from-snap snap1

# Show diff size
rbd diff replicapool/myimage@snap2 --from-snap snap1 | \
  awk '{ sum += $2 } END { print sum/1024/1024 " MB changed" }'
```

## Monitoring Delta Sync Progress

During snapshot-based replication, monitor sync progress:

```bash
# Check mirror image status for sync progress
rbd mirror image status replicapool/myimage

# During sync:
# state: up+replaying
# description: replaying, {"replay_state":"syncing","syncing_percent":45.0, ...}

# JSON format for scripting
rbd mirror image status replicapool/myimage --format json | \
  jq '{state: .state, description: .description}'
```

## Bandwidth Estimation

Estimate expected replication bandwidth based on change rate:

```bash
#!/bin/bash
# Estimate delta size between most recent two mirror snapshots
IMAGE="replicapool/myimage"

SNAPS=$(rbd snap ls $IMAGE --format json | jq -r '.[].name' | grep "mirror.primary" | tail -2)
SNAP1=$(echo "$SNAPS" | head -1)
SNAP2=$(echo "$SNAPS" | tail -1)

echo "Diff between $SNAP1 and $SNAP2:"
rbd diff "${IMAGE}@${SNAP2}" --from-snap "$SNAP1" | \
  awk '{ sum += $2 } END { printf "%.2f MB\n", sum/1024/1024 }'
```

## Optimizing Delta Sync

Shorter snapshot intervals mean smaller deltas per sync, reducing burst bandwidth. Configure appropriately:

```bash
# 15-minute intervals for write-heavy workloads
rbd mirror snapshot schedule add \
  --pool replicapool \
  --image myimage \
  15m
```

Also control the number of concurrent image syncs to manage bandwidth:

```bash
# Limit concurrent image syncs for the mirror daemon (default: 5)
ceph config set rbd-mirror rbd_mirror_concurrent_image_syncs 3
```

## Summary

Delta synchronization in RBD snapshot-based mirroring transfers only changed data blocks between snapshots, dramatically reducing bandwidth compared to full image copies. Enable `object-map` and `fast-diff` features for efficient diff calculation. Use `rbd diff` to estimate delta sizes between snapshots, and tune snapshot intervals to balance RPO against network load. Monitor sync progress with `rbd mirror image status`.
