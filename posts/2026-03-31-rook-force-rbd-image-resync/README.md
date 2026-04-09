# How to Force RBD Image Resync

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, RBD, Mirroring, Resync, Troubleshooting

Description: Learn how to force an RBD image resync in Ceph mirroring to recover from corrupted or stalled replication states and restore a healthy mirroring relationship.

---

## Overview

RBD mirroring can sometimes get stuck in an error state due to network issues, OSD failures, or journal corruption. When an image's mirror status shows an error and normal troubleshooting does not resolve it, forcing a resync triggers a full re-copy of the image from the primary to the secondary, restoring a consistent state.

## Identifying Images That Need Resync

Check mirror status for error states:

```bash
# Check overall pool mirror status
rbd mirror pool status replicapool

# Check individual image status
rbd mirror image status replicapool/myimage

# Look for states like: error, stopped, or unknown
# Description may show: "split-brain" or "failed to decode"
```

Common error states that warrant a resync:
- `up+error` - daemon is up but image is in error state
- `up+stopped` - stopped due to split-brain or other issues
- Stuck progress that does not advance

## Forcing a Resync

The resync command marks the non-primary image for full re-synchronization:

```bash
# Force resync on the secondary cluster
rbd mirror image resync replicapool/myimage
```

After issuing the command, the image transitions through these states:

```bash
# Monitor progress
watch rbd mirror image status replicapool/myimage

# Expected progression:
# 1. up+syncing (full image copy in progress)
# 2. up+starting_replay (transitioning to replay mode)
# 3. up+replaying (sync complete, replaying incremental changes)
```

## Resync for Pool-Level Recovery

If multiple images are in error state, resync them all:

```bash
#!/bin/bash
POOL="replicapool"

# Find all images in error state
rbd mirror pool status $POOL --verbose --format json | \
  jq -r '.images[] | select(.state | contains("error")) | .name' | \
while read img; do
  echo "Resyncing $img..."
  rbd mirror image resync $POOL/$img
done
```

## Monitoring Resync Progress

Track the resync progress for each image:

```bash
# Detailed status showing sync progress
rbd mirror image status replicapool/myimage

# Output during sync:
# state:       up+syncing
# description: bootstrapping, IMAGE_COPY/COPY_OBJECT 45%
```

For large images, resync can take significant time. Monitor I/O on the network link between clusters to ensure data is flowing.

## Rook: Triggering Resync via Toolbox

```bash
TOOLBOX=$(kubectl -n rook-ceph get pod -l app=rook-ceph-tools \
  -o jsonpath='{.items[0].metadata.name}')

kubectl -n rook-ceph exec -it $TOOLBOX -- \
  rbd mirror image resync replicapool/myimage

# Monitor from toolbox
kubectl -n rook-ceph exec -it $TOOLBOX -- \
  watch rbd mirror image status replicapool/myimage
```

## Preventive Measures

Reduce the need for resyncs by:

```bash
# Increase the journal object order to reduce journal overflow (default is 24)
rbd config image set replicapool/myimage rbd_journal_order 26

# Set a longer commit interval to batch more writes (default is 5 seconds)
rbd config image set replicapool/myimage rbd_journal_commit_age 10
```

## Summary

Forcing an RBD image resync recovers images stuck in error states by triggering a full re-copy from primary to secondary. Use `rbd mirror image resync` on the secondary cluster, then monitor progress with `rbd mirror image status`. For environments with multiple errors, script the resync across all affected images. Proper journal configuration reduces the frequency of resync requirements.
