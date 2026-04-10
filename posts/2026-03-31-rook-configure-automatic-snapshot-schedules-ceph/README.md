# How to Configure Automatic Snapshot Schedules in Ceph

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Snapshot, Schedule, Automation, Data Protection

Description: Learn how to configure automatic snapshot schedules in Ceph using the snap_schedule manager module for RBD images and CephFS directories, with retention policies.

---

## Ceph Snapshot Scheduling

Ceph provides automatic, time-based snapshot creation for both RBD images and CephFS directories. CephFS uses the `snap_schedule` manager module, while RBD uses snapshot scheduling through the `rbd mirror snapshot schedule` commands as part of the RBD mirroring subsystem.

## Enabling the Snap Schedule Module

```bash
ceph mgr module enable snap_schedule
```

Verify it is active:

```bash
ceph mgr module ls | grep snap_schedule
```

## Configuring RBD Snapshot Schedules

### Enable Snapshot-Based Mirroring (Required for RBD Snap Schedule)

RBD snapshot scheduling requires mirroring to be enabled on the pool and image:

```bash
# Enable mirroring on the pool in image mode
rbd mirror pool enable mypool image

# Enable snapshot-based mirroring on the image
rbd mirror image enable mypool/myimage snapshot
```

### Add a Schedule

```bash
# Daily snapshot at midnight
rbd mirror snapshot schedule add --pool mypool --image myimage 24h

# Hourly snapshot
rbd mirror snapshot schedule add --pool mypool --image myimage 1h

# Snapshot every 6 hours starting at midnight
rbd mirror snapshot schedule add --pool mypool --image myimage 6h 2026-01-01T00:00:00
```

### List Schedules

```bash
rbd mirror snapshot schedule list --pool mypool --image myimage
```

### Remove a Schedule

```bash
rbd mirror snapshot schedule remove --pool mypool --image myimage 24h
```

## Configuring CephFS Snapshot Schedules

### Add a Schedule for a Directory

```bash
# Daily snapshots for /data directory in myfs
ceph fs snap-schedule add /data 1d --fs myfs

# Weekly snapshots
ceph fs snap-schedule add /data 1w --fs myfs

# Hourly snapshots
ceph fs snap-schedule add /data 1h --fs myfs
```

### View Active Schedules

```bash
ceph fs snap-schedule status /data --fs myfs
```

Output:
```json
{
  "fs": "myfs",
  "subvol": null,
  "path": "/data",
  "rel_path": "/data",
  "schedule": "1d",
  "retention": {},
  "start": "2026-01-01T00:00:00",
  "created": "2026-01-01T09:00:00",
  "first": "2026-01-01T00:00:00",
  "last": "2026-03-31T00:00:00",
  "last_pruned": "2026-03-25T00:00:00",
  "created_count": 90,
  "pruned_count": 83,
  "active": true
}
```

### Set Retention Policy

Retain 7 daily and 4 weekly snapshots:

```bash
ceph fs snap-schedule retention add /data d 7 --fs myfs
ceph fs snap-schedule retention add /data w 4 --fs myfs
```

### List All Schedules

```bash
ceph fs snap-schedule list / --recursive --fs myfs
```

### Deactivate a Schedule

```bash
ceph fs snap-schedule deactivate /data 1d --fs myfs
```

## Verifying Snapshots Are Being Created

For CephFS, list snapshots in the .snap directory:

```bash
ls /mnt/cephfs/data/.snap/
```

Output:
```text
_scheduled_2026-03-31-000000_1774915200
_scheduled_2026-03-30-000000_1774828800
```

## Summary

The Ceph `snap_schedule` manager module automates point-in-time snapshot creation for both RBD images and CephFS directories. Enable the CephFS module with `ceph mgr module enable snap_schedule`, then create schedules using `rbd mirror snapshot schedule add` for block devices or `ceph fs snap-schedule add` for filesystem directories. Always configure retention policies to automatically prune old snapshots and prevent unbounded storage growth.
