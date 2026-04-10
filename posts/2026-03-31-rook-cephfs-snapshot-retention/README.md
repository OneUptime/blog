# How to Set Snapshot Retention Policies for CephFS in Rook

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, CephFS, Snapshot, Storage

Description: Learn how to configure snapshot retention policies for CephFS in Rook to automatically prune old snapshots and manage storage usage effectively.

---

## Why Snapshot Retention Matters

CephFS snapshots are lightweight and fast to create, but they accumulate over time. Each snapshot holds references to the data at the point it was taken. As files change, the snapshot retains the old blocks. Without a retention policy, snapshots grow unbounded and can consume significant extra storage.

Retention policies define how many snapshots to keep per schedule interval. When a new snapshot is taken and the limit is exceeded, the oldest snapshot in that period is automatically deleted.

## Enabling the Snapshot Scheduling Module

Retention policies are managed by the `snap_schedule` manager module. Enable it:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- ceph mgr module enable snap_schedule
```

Verify it is active:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- ceph mgr module ls | grep snap_schedule
```

## Adding Retention Policies

Retention is configured per path and per schedule interval. The interval codes are:

- `n` - last N snapshots (regardless of timing)
- `h` - hours
- `d` - days
- `w` - weeks
- `M` - months
- `y` - years

Example: Keep 12 hourly, 7 daily, and 4 weekly snapshots at the filesystem root:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- bash

ceph fs snap-schedule retention add / h 12 --fs myfs
ceph fs snap-schedule retention add / d 7 --fs myfs
ceph fs snap-schedule retention add / w 4 --fs myfs
```

## Viewing Retention Configuration

List the current schedules and retention settings:

```bash
ceph fs snap-schedule status / --fs myfs --format json
```

Sample output:

```json
[
  {
    "path": "/",
    "schedule": "1h",
    "retention": {
      "h": 12,
      "d": 7,
      "w": 4
    },
    "created_count": 45,
    "pruned_count": 33
  }
]
```

The `pruned_count` shows how many snapshots were automatically removed by the retention policy.

## Removing a Retention Policy

If you need to change a retention limit, first remove the existing one and add the new value:

```bash
ceph fs snap-schedule retention remove / h 12 --fs myfs
ceph fs snap-schedule retention add / h 24 --fs myfs
```

## Listing Existing Snapshots

Check what snapshots currently exist:

```bash
ceph fs snap-schedule status / --fs myfs
```

Or inspect the `.snap` directory from a pod that has the filesystem mounted:

```bash
kubectl exec -it <your-pod> -- ls -la /mnt/data/.snap/
```

Each entry is a read-only directory named with the timestamp of when the snapshot was taken.

## Estimating Snapshot Storage Usage

Snapshots do not clone data immediately. They reference unchanged blocks. Over time, changed blocks are kept alive by snapshots. To view pool storage usage:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- ceph df detail
```

Note that the POOLS section numbers are notional and do not directly account for snapshot overhead. For a more accurate view of snapshot-related storage, check the `OBJECTS` column growth over time for the CephFS data pool.

## Summary

Snapshot retention policies for CephFS in Rook are set using the `snap_schedule` manager module with the `retention add` command. Specify the path, interval code, and count. Retention automatically prunes the oldest snapshots beyond the configured limit. Review `ceph fs snap-schedule status` output regularly to confirm pruning is working as expected and storage usage remains bounded.
