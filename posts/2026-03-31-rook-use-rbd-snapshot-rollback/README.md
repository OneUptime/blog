# How to Use RBD Snapshot Rollback

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, RBD, Snapshot, Rollback, Data Recovery

Description: Learn how to roll back an RBD image to a previous snapshot in Ceph, understand the impact on data between snapshots, and safely perform rollback for Kubernetes PVCs.

---

## What is RBD Snapshot Rollback?

Snapshot rollback reverts an RBD image to its state at a specific snapshot point. All changes made after the snapshot was created are permanently discarded. This is useful for:

- Recovering from application errors or bad deployments
- Undoing accidental data deletion
- Rolling back a failed migration

**Important:** Rollback is destructive. Data written after the snapshot will be lost. Always verify you have a newer backup if needed.

## Prerequisites

- An RBD image with an existing snapshot
- Access to stop all clients so the image is no longer in use

## Step 1: List Available Snapshots

```bash
rbd snap ls mypool/myimage
```

Output:
```text
SNAPID  NAME            SIZE    PROTECTED  TIMESTAMP
1       snap-before-upgrade  10 GiB  no  Tue Mar 31 09:00:00 2026
2       snap-after-deploy    10 GiB  no  Tue Mar 31 11:00:00 2026
```

## Step 2: Stop Using the Image and Confirm It Has No Open Clients

For Kubernetes PVCs, scale down the workload:

```bash
kubectl scale deployment myapp --replicas=0 -n myapp
```

Wait for pods to terminate:

```bash
kubectl wait --for=delete pod -l app=myapp -n myapp --timeout=120s
```

Then confirm Ceph sees no open clients for the image:

```bash
rbd status mypool/myimage
```

## Step 3: Perform the Rollback

```bash
rbd snap rollback mypool/myimage@snap-before-upgrade
```

This rewrites the image to match the snapshot state. The time taken depends on how much data changed after the snapshot.

Progress output:
```text
Rolling back to snapshot: 100% complete...done.
```

## Step 4: Verify the Rollback

Map the image and check the filesystem:

```bash
DEV=$(rbd device map mypool/myimage)
mkdir -p /mnt/check
mount "$DEV" /mnt/check
ls /mnt/check
umount /mnt/check
rbd device unmap "$DEV"
```

## Step 5: Restart the Workload

```bash
kubectl scale deployment myapp --replicas=3 -n myapp
```

## Rollback via Kubernetes (Manual Process)

The Kubernetes VolumeSnapshot API does not support in-place rollback. To "roll back" a PVC in Kubernetes, you restore from snapshot by creating a new PVC:

```yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: myapp-pvc-rolled-back
spec:
  storageClassName: rook-ceph-block
  dataSource:
    name: snap-before-upgrade
    kind: VolumeSnapshot
    apiGroup: snapshot.storage.k8s.io
  accessModes:
    - ReadWriteOnce
  resources:
    requests:
      storage: 10Gi
```

Then update your deployment to use the new PVC name.

## Creating a Pre-Rollback Snapshot

Before rolling back, protect the current state as a new snapshot:

```bash
rbd snap create mypool/myimage@pre-rollback-$(date +%Y%m%d%H%M%S)
```

This ensures you can undo the rollback if needed.

## Summary

RBD snapshot rollback reverts a block device image to a previous state using `rbd snap rollback`. Always stop all users of the image and confirm it has no open clients before rolling back, and create a pre-rollback snapshot to preserve the ability to undo the operation. For Kubernetes PVC rollback, create a new PVC from the target VolumeSnapshot and update the workload's volume reference rather than attempting in-place rollback.
