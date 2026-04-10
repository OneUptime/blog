# How to Create Mirror Snapshots Manually for RBD

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, RBD, Snapshot, Mirroring, Storage

Description: Learn how to manually create mirror snapshots for RBD images in Ceph, enabling on-demand cross-cluster replication points for snapshot-based mirroring.

---

## Overview

Snapshot-based RBD mirroring replicates images by periodically copying snapshots rather than streaming a continuous journal. You can trigger these mirror snapshots manually using the `rbd` CLI, which is useful for testing, one-time replication events, or supplementing scheduled snapshots with on-demand captures.

## Prerequisites

Before creating mirror snapshots manually, ensure:
- The pool has mirroring enabled in snapshot mode
- The image has mirroring enabled

```bash
# Enable pool mirroring in snapshot mode
rbd mirror pool enable replicapool image

# Enable mirroring on a specific image
rbd mirror image enable replicapool/myimage snapshot

# Verify mirroring mode
rbd info replicapool/myimage
```

## Creating a Mirror Snapshot Manually

Use the `rbd mirror image snapshot` command to create an on-demand mirror snapshot:

```bash
# Create a mirror snapshot for a specific image
rbd mirror image snapshot replicapool/myimage

# Output example:
# Scheduling snapshot for image replicapool/myimage at ...
# Snapshot ID: 4
```

The snapshot is immediately queued for replication to the secondary cluster.

## Verifying the Snapshot Was Created

List snapshots on the image to confirm the mirror snapshot exists:

```bash
# List all snapshots including mirror snapshots
rbd snap ls replicapool/myimage

# Show detailed mirror snapshot info
rbd mirror image status replicapool/myimage
```

Mirror snapshots appear with the prefix `mirror.primary` in the snapshot listing.

## Creating Snapshots for Multiple Images

To snapshot all mirrored images in a pool at once, use a loop:

```bash
#!/bin/bash
POOL="replicapool"

# Get list of all mirrored images
IMAGES=$(rbd mirror image ls $POOL --format json | jq -r '.[].name')

for img in $IMAGES; do
  echo "Creating snapshot for $img"
  rbd mirror image snapshot $POOL/$img
done
```

## Checking Replication Progress

After creating a snapshot, monitor replication progress on the secondary cluster:

```bash
# On the secondary cluster
rbd mirror image status replicapool/myimage

# Look for "replaying" state and snapshot sync progression
# Example output:
# global_id:   <uuid>
# state:       up+replaying
# description: replaying, {"bytes_per_second":0.0,"bytes_per_snapshot":0.0,
#   "local_snapshot_timestamp":...,"remote_snapshot_timestamp":...,
#   "replay_state":"idle"}
```

## Rook: Triggering Snapshots via Toolbox

In a Rook environment, run manual snapshot commands from the Rook toolbox pod:

```bash
# Get the toolbox pod name
TOOLBOX=$(kubectl -n rook-ceph get pod -l app=rook-ceph-tools \
  -o jsonpath='{.items[0].metadata.name}')

# Create a mirror snapshot
kubectl -n rook-ceph exec -it $TOOLBOX -- \
  rbd mirror image snapshot replicapool/myimage
```

## Summary

Manual mirror snapshot creation gives you on-demand control over RBD replication in snapshot-based mirroring mode. Use `rbd mirror image snapshot` to trigger immediate snapshots, monitor progress via `rbd mirror image status`, and script bulk snapshots across all mirrored images. In Rook environments, use the toolbox pod to execute these commands.
