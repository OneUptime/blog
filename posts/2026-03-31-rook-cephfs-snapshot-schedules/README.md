# How to Configure Snapshot Schedules for CephFS Mirroring in Rook

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, CephFS, Snapshot, Mirroring

Description: Learn how to configure automatic snapshot schedules for CephFS mirroring in Rook to ensure consistent recovery points across replicated clusters.

---

## Why Snapshot Schedules Matter for Mirroring

CephFS mirroring synchronizes directory trees between two Ceph clusters. Mirroring is snapshot-based: changes are captured at snapshot points and replicated to the remote cluster. Without scheduled snapshots, mirroring relies on manual snapshots or application-triggered ones, leaving gaps in your recovery point objectives (RPO).

Automated snapshot schedules ensure that mirroring creates consistent points at regular intervals, giving you predictable RPO windows.

## Prerequisites

Before configuring snapshot schedules, ensure:
1. CephFS mirroring is enabled and the `CephFilesystemMirror` CRD is deployed.
2. The remote cluster peer is configured.
3. The `ceph-mgr` snapshot scheduling module is enabled.

Enable the snapshot scheduling module:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- ceph mgr module enable snap_schedule
```

## Configuring Snapshot Schedules

Snapshot schedules are set per directory path within the filesystem. Use the Rook toolbox to interact with the `snap_schedule` manager module:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- bash
```

Add a schedule to the root of the filesystem:

```bash
# Snapshot every hour on the /myfs filesystem root
ceph fs snap-schedule add / 1h --fs myfs

# Snapshot every day at midnight
ceph fs snap-schedule add / 1d --fs myfs

# Snapshot every 6 hours with a specific start time
ceph fs snap-schedule add /shared 6h 2024-01-01T00:00:00 --fs myfs
```

List configured schedules:

```bash
ceph fs snap-schedule list / --fs myfs
```

Sample output:

```text
path    | schedule | retention policy
--------+----------+-----------------
/       | 1h       |
/       | 1d       |
/shared | 6h       |
```

## Setting Retention Policies

Retention policies automatically prune old snapshots to avoid filling the filesystem:

```bash
# Keep 24 hourly snapshots and 7 daily snapshots
ceph fs snap-schedule retention add / h 24 --fs myfs
ceph fs snap-schedule retention add / d 7 --fs myfs
```

Verify retention settings:

```bash
ceph fs snap-schedule list / --fs myfs --format json | python3 -m json.tool
```

## Verifying Mirroring Sync Status

After snapshots are taken, check that they are being replicated:

```bash
# Check overall mirror daemon status
ceph fs snapshot mirror daemon status
```

Output will show sync state and per-filesystem details. You can get more detailed per-filesystem mirror status via the admin socket on the mirror daemon host:

```bash
ceph --admin-daemon /var/run/ceph/ceph-client.cephfs-mirror.<id>.asok fs mirror status myfs@<fsid>
```

## Snapshot Directory Layout

CephFS stores snapshots in a `.snap` directory visible at the filesystem level:

```bash
kubectl exec -it <pod-with-cephfs-mount> -- ls /mnt/cephfs/.snap
```

Each snapshot appears as a timestamped directory. These are read-only and can be used to restore files manually.

## Summary

Snapshot schedules for CephFS mirroring in Rook are managed through the `snap_schedule` Ceph manager module. Enable the module, then use `ceph fs snap-schedule add` to create schedules per directory path. Pair schedules with retention policies to manage storage. Verify that the mirror daemon is picking up new snapshots and syncing them to the remote cluster by checking `ceph fs snapshot mirror daemon status`.
