# How to Configure init-only Mirroring Mode for RBD

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, RBD, Mirroring, Snapshot

Description: Learn how to configure init-only mirroring mode for RBD images in Rook-Ceph for one-time initial sync without ongoing continuous replication.

---

## Why Use Snapshot Mirroring for a One-Time Sync

RBD snapshot-based mirroring can be used to perform a controlled one-time synchronization of a large image to a secondary cluster. By enabling snapshot mirroring on an image and creating a single manual snapshot (without a recurring schedule), you can sync the image once and then decide whether to add a schedule for continuous replication or promote the secondary for a data migration.

This approach is useful for:
- Seeding a secondary cluster with a large base image before switching to continuous mirroring
- One-time data migration between clusters
- Creating a point-in-time copy on the secondary without ongoing overhead

## Step 1 - Enable Snapshot Mirroring on the Pool

Snapshot-based mirroring must be configured at the pool level first:

```bash
kubectl exec -it deploy/rook-ceph-tools -n rook-ceph -- \
  rbd mirror pool enable replicapool image
```

## Step 2 - Enable Snapshot Mirroring on the Image

Enable snapshot-based mirroring on the image to sync:

```bash
kubectl exec -it deploy/rook-ceph-tools -n rook-ceph -- \
  rbd mirror image enable replicapool/large-base-image snapshot
```

## Step 3 - Create the Initial Snapshot

Trigger the first snapshot that will be synced to the secondary:

```bash
kubectl exec -it deploy/rook-ceph-tools -n rook-ceph -- \
  rbd mirror image snapshot replicapool/large-base-image
```

## Step 4 - Monitor the Initial Sync

Watch the sync progress on the secondary cluster:

```bash
kubectl exec -it deploy/rook-ceph-tools -n rook-ceph-secondary -- \
  rbd mirror image status replicapool/large-base-image
```

```text
large-base-image:
  global_id:   xyz-789
  state:       up+syncing
  description: syncing, 45.2 GiB / 100 GiB
  last_update: 2026-03-31T10:05:00
```

Wait until the sync completes and the state shows `up+replaying` with an idle status:

```text
large-base-image:
  global_id:   xyz-789
  state:       up+replaying
  description: idle
```

## Step 5 - Transition to Continuous Mirroring

Once the initial sync is complete, add a snapshot schedule to enable continuous replication. Since the image is already using snapshot-based mirroring, you only need to add a recurring schedule:

```bash
kubectl exec -it deploy/rook-ceph-tools -n rook-ceph -- \
  rbd mirror snapshot schedule add --pool replicapool --image large-base-image 1h
```

## Step 6 - Use One-Time Sync for Data Migration

For a one-time migration, complete the initial sync (skip Step 5), then use the secondary image as the new primary:

```bash
# Demote primary on source
kubectl exec -it deploy/rook-ceph-tools -n rook-ceph -- \
  rbd mirror image demote replicapool/large-base-image

# Promote on secondary
kubectl exec -it deploy/rook-ceph-tools -n rook-ceph-secondary -- \
  rbd mirror image promote replicapool/large-base-image
```

## Step 7 - Verify the Final State

Confirm the image on the secondary is now primary and writable:

```bash
kubectl exec -it deploy/rook-ceph-tools -n rook-ceph-secondary -- \
  rbd mirror image status replicapool/large-base-image
```

```text
large-base-image:
  global_id:   xyz-789
  state:       up+stopped
  description: local image is primary
```

```bash
kubectl exec -it deploy/rook-ceph-tools -n rook-ceph-secondary -- \
  rbd info replicapool/large-base-image | grep "mirroring primary"
```

```text
mirroring primary: true
```

## Summary

RBD snapshot-based mirroring provides a controlled way to perform an initial one-time synchronization of large images before enabling continuous replication. Enable snapshot mirroring with `rbd mirror image enable <pool>/<image> snapshot`, create a manual snapshot, wait for the sync to complete, then add a snapshot schedule for continuous mirroring or promote the secondary for a clean data migration. By creating a single manual snapshot first (without a schedule), you control exactly when the initial sync happens and can verify it completes before enabling ongoing replication.
