# How to Set Up Point-in-Time Recovery with RBD Mirroring

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, RBD, Mirroring, Recovery, Snapshot

Description: Learn how to configure point-in-time recovery for RBD mirroring in Ceph, allowing you to recover data to any previous snapshot across replicated clusters.

---

## Overview

Point-in-time recovery (PITR) with RBD mirroring allows you to restore an image to a specific past state using retained mirror snapshots. This is critical when data corruption is replicated to the secondary cluster - you need to roll back to a snapshot taken before corruption occurred. Snapshot-based mirroring with snapshot retention policies enables this capability.

## Setting Up Snapshot-Based Mirroring

Enable snapshot-based mirroring on the pool and images:

```bash
# Enable pool mirroring in image mode
rbd mirror pool enable replicapool image

# Enable snapshot-based mirroring on an image
rbd mirror image enable replicapool/myimage snapshot

# Verify
rbd mirror image info replicapool/myimage
```

## Configuring Snapshot Schedule for PITR

Create frequent scheduled snapshots to reduce recovery point gaps:

```bash
# Schedule snapshots every 15 minutes
rbd mirror snapshot schedule add \
  --pool replicapool \
  --image myimage \
  15m

# Add daily snapshots for longer retention
rbd mirror snapshot schedule add \
  --pool replicapool \
  --image myimage \
  1d 02:00:00
```

## Retaining Snapshots for PITR

Mirror snapshots are automatically cleaned up after replication. To retain them for PITR, create regular non-mirror snapshots on both clusters:

```bash
# Create a named recovery snapshot
DATE=$(date +%Y%m%d-%H%M%S)
rbd snap create replicapool/myimage@pitr-$DATE

# List all retained snapshots
rbd snap ls replicapool/myimage
```

## Recovering to a Point in Time

When you need to recover to a previous state:

```bash
# On the secondary cluster, list available snapshots
rbd snap ls replicapool/myimage

# Promote the secondary image to primary (use --force if the primary is unreachable)
rbd mirror image promote replicapool/myimage

# Roll back to a specific snapshot
rbd snap rollback replicapool/myimage@pitr-20260331-020000

# Map and mount the image
rbd map replicapool/myimage
mount /dev/rbd0 /mnt/recovery
```

## Rook: PITR with Snapshot Schedules

In Rook, configure snapshot schedules in the CephBlockPool:

```yaml
apiVersion: ceph.rook.io/v1
kind: CephBlockPool
metadata:
  name: replicapool
  namespace: rook-ceph
spec:
  replicated:
    size: 3
  mirroring:
    enabled: true
    mode: image
    snapshotSchedules:
      - interval: 15m
      - interval: 1d
        startTime: "02:00:00"
```

## Automating Snapshot Retention with a CronJob

Use a Kubernetes CronJob to create and manage PITR snapshots:

```yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: rbd-pitr-snapshots
  namespace: rook-ceph
spec:
  schedule: "*/30 * * * *"
  jobTemplate:
    spec:
      template:
        spec:
          containers:
            - name: rbd-snap
              image: ceph/ceph:v18
              command:
                - /bin/bash
                - -c
                - |
                  DATE=$(date +%Y%m%d-%H%M%S)
                  rbd snap create replicapool/myimage@pitr-$DATE
                  # Retain only last 48 snapshots (24 hours at 30m)
                  rbd snap ls replicapool/myimage --format json | \
                    jq -r '.[:-48] | .[].name' | \
                    xargs -I{} rbd snap rm replicapool/myimage@{}
          restartPolicy: OnFailure
```

## Summary

Point-in-time recovery with RBD mirroring relies on retained snapshots on the secondary cluster. Configure frequent snapshot schedules to reduce the gap between recovery points, supplement mirror snapshots with named snapshots for longer retention, and automate retention policies via CronJobs. When recovery is needed, use `rbd snap rollback` to restore to the desired state.
