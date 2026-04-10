# How to Configure FileStore Settings in Ceph (Legacy)

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Filestore, LEGACY, Storage

Description: Learn how to configure FileStore OSD settings in legacy Ceph clusters and understand how to migrate to the modern BlueStore backend.

---

## FileStore Overview

FileStore was the original OSD backend in Ceph, storing objects as files on a local POSIX filesystem (typically XFS). It uses a write-ahead journal to ensure consistency. FileStore has been deprecated since Ceph Luminous (where BlueStore became the default) and is removed in Ceph Reef and later releases. BlueStore is now the default and recommended backend.

If you are managing an older cluster still using FileStore, this guide covers the relevant configuration settings.

## FileStore Configuration Parameters

```ini
[osd]
# Use filestore backend
osd_objectstore = filestore

# Journal settings
osd_journal_size = 10240
filestore_journal_writeahead = true

# Synchronization interval
filestore_max_sync_interval = 5
filestore_min_sync_interval = 0.01

# I/O threads
filestore_op_threads = 2
filestore_queue_max_ops = 500
filestore_queue_max_bytes = 104857600

# XFS mount options
filestore_xfs_extsize = true
```

## Journal Configuration

The FileStore journal is critical for performance and durability. Place the journal on a fast device (SSD or NVMe) separate from the OSD data disk:

```ini
[osd]
osd_journal = /dev/sdb1
osd_journal_size = 10240
```

Where `/dev/sdb1` is a dedicated journal partition on an SSD. Each OSD needs its own journal partition.

## Viewing FileStore OSD Status

Check whether your OSDs are using FileStore or BlueStore:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph osd metadata | jq '.[] | {id: .id, objectstore: .osd_objectstore}'
```

## Migrating from FileStore to BlueStore

Migrating requires replacing OSDs one at a time. The safest approach:

1. Mark the OSD out and wait for rebalancing
2. Stop the OSD daemon
3. Destroy and recreate the OSD with BlueStore
4. Allow data to backfill

```bash
# Step 1 - mark OSD out
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph osd out osd.X

# Step 2 - wait for rebalance
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph -s

# Step 3 - in Rook, delete the OSD deployment and let Rook reprovision
kubectl -n rook-ceph delete deploy rook-ceph-osd-X
```

Rook will reprovision the OSD as BlueStore if the device is wiped and prepared fresh.

## FileStore Tuning for HDD Workloads

For legacy clusters on spinning disks:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph config set osd filestore_max_sync_interval 10

kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph config set osd filestore_op_threads 4
```

## Summary

FileStore is a legacy OSD backend replaced by BlueStore in modern Ceph. If you must manage FileStore OSDs, keep journal devices on fast storage and tune sync intervals and I/O threads for your workload. Migrate to BlueStore by replacing OSDs one at a time using Rook's OSD management tooling. New clusters should always use BlueStore.
