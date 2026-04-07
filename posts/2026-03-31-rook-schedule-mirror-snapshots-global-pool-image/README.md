# How to Schedule Mirror Snapshots (Global, Pool, Image Level)

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, RBD, Snapshot, Schedule, Mirroring

Description: Learn how to configure automated mirror snapshot schedules at the global, pool, and image level in Ceph for snapshot-based RBD mirroring replication.

---

## Overview

Ceph supports snapshot schedules for RBD mirroring at three granularities: global (all pools), pool level, and individual image level. These schedules automate the creation of mirror snapshots, which drive data replication in snapshot-based mirroring mode. More specific schedules override less specific ones.

## Checking the Snapshot Scheduler Module

The snapshot scheduler is provided by the `rbd_support` MGR module. Verify it is enabled:

```bash
ceph mgr module ls | grep rbd_support
# Enable if not active
ceph mgr module enable rbd_support
```

## Setting a Global Snapshot Schedule

A global schedule applies to all mirrored images across all pools unless overridden:

```bash
# Schedule a snapshot every hour globally
rbd mirror snapshot schedule add 1h

# Schedule at a specific start time
rbd mirror snapshot schedule add 24h 02:00:00

# List the global schedule
rbd mirror snapshot schedule ls
```

## Setting a Pool-Level Schedule

Override the global schedule for a specific pool:

```bash
# Set hourly snapshots for replicapool
rbd mirror snapshot schedule add --pool replicapool 30m

# Set a daily schedule at midnight
rbd mirror snapshot schedule add --pool replicapool 1d 00:00:00

# List pool-level schedules
rbd mirror snapshot schedule ls --pool replicapool
```

## Setting an Image-Level Schedule

For fine-grained control, set a schedule on a specific image:

```bash
# Set a 15-minute schedule on a critical image
rbd mirror snapshot schedule add --pool replicapool --image critical-db 15m

# List image-level schedules
rbd mirror snapshot schedule ls --pool replicapool --image critical-db
```

## Viewing All Active Schedules

```bash
# Show all schedules including inherited ones
rbd mirror snapshot schedule list --recursive

# Show status of scheduled runs
rbd mirror snapshot schedule status --pool replicapool
```

## Rook CRD: Snapshot Schedule Configuration

In Rook, configure snapshot schedules directly in the `CephBlockPool` spec:

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
      - interval: 1h
        startTime: "00:00:00"
```

For image-level schedules in Rook, use the toolbox to run the CLI command directly:

```bash
kubectl -n rook-ceph exec -it $TOOLBOX -- \
  rbd mirror snapshot schedule add --pool replicapool --image myimage 30m
```

## Removing a Schedule

```bash
# Remove pool-level schedule
rbd mirror snapshot schedule remove --pool replicapool 30m
```

## Summary

Ceph's snapshot scheduling system supports global, pool-level, and image-level schedules for automated RBD mirroring. Use Rook's `CephBlockPool` `snapshotSchedules` field for pool-level automation, and use the toolbox for image-level overrides. Fine-grained schedules on critical images ensure lower RPO while less critical images can rely on coarser global schedules.
