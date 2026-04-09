# How to List CephFS Filesystems and Flags

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ceph, Rook, CephFS

Description: Learn how to list CephFS filesystems, inspect their flags, and understand filesystem settings using ceph fs ls and related commands in Rook clusters.

---

## Listing All CephFS Filesystems

Use `ceph fs ls` to list all CephFS filesystems in the cluster. In a Rook environment, run this from the toolbox pod:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- ceph fs ls
```

Sample output:

```text
name: myfs, metadata pool: myfs-metadata, data pools: [myfs-data ]
name: backup-fs, metadata pool: backup-metadata, data pools: [backup-data ]
```

## Detailed Filesystem Status

Get a comprehensive status view of a specific filesystem:

```bash
ceph fs status myfs
```

Sample output:

```text
myfs - 2 clients
====
RANK  STATE      MDS         ACTIVITY     DNS    INOS   DIRS   CAPS
 0    active     myfs-a(up)  Reqs:    0   114    113    0      1

POOL         TYPE     USED  AVAIL
myfs-metadata  metadata  33.6M   900G
myfs-data      data      3.21G   900G

STANDBY MDS
myfs-b

MDS version: ceph version 18.2.0
```

## Listing All Filesystems with JSON

For scripting and automation, use JSON format:

```bash
ceph fs ls --format json-pretty
```

Sample output:

```json
[
  {
    "name": "myfs",
    "metadata_pool": "myfs-metadata",
    "metadata_pool_id": 1,
    "data_pool_ids": [2],
    "data_pools": ["myfs-data"]
  }
]
```

## Getting Filesystem Dump

`ceph fs dump` provides the full filesystem map including all filesystems and their MDS state:

```bash
ceph fs dump
```

Sample output:

```text
epoch 42
flags
compat compat={},rocompat={},incompat={1=base v0.20,2=client writeable ranges,3=default file layouts on dirs,...}

Filesystem 'myfs' (1)
fs_name    myfs
epoch      36
flags      50
created    2026-01-15T12:00:00.000000+0000
modified   2026-03-01T08:00:00.000000+0000
tableserver 0
root    0
session_timeout 60
session_autoclose 300
...
```

## Understanding Filesystem Flags

The `flags` field in the filesystem dump is a bitmask. The flag definitions come from `CEPH_MDSMAP_*` constants in the Ceph source (`src/include/ceph_fs.h`):

| Bit | Hex | Decimal | Flag Name | Meaning |
|---|---|---|---|---|
| 1<<0 | `0x1` | 1 | `CEPH_MDSMAP_NOT_JOINABLE` | MDS daemons cannot join this filesystem (inverse of joinable) |
| 1<<1 | `0x2` | 2 | `CEPH_MDSMAP_ALLOW_SNAPS` | Cluster allowed to create snapshots |
| 1<<2 | `0x4` | 4 | _(deprecated)_ | Was `ALLOW_MULTIMDS` |
| 1<<3 | `0x8` | 8 | _(deprecated)_ | Was `ALLOW_DIRFRAGS` |
| 1<<4 | `0x10` | 16 | `CEPH_MDSMAP_ALLOW_MULTIMDS_SNAPS` | Allow multi-active MDS with snapshots |
| 1<<5 | `0x20` | 32 | `CEPH_MDSMAP_ALLOW_STANDBY_REPLAY` | Allow standby-replay MDS daemons |
| 1<<6 | `0x40` | 64 | `CEPH_MDSMAP_REFUSE_CLIENT_SESSION` | Refuse new client sessions |
| 1<<7 | `0x80` | 128 | `CEPH_MDSMAP_REFUSE_STANDBY_FOR_ANOTHER_FS` | Do not use this FS standby for another FS |
| 1<<8 | `0x100` | 256 | `CEPH_MDSMAP_BALANCE_AUTOMATE` | Automate metadata balancing |

The default flags for a new filesystem are `ALLOW_SNAPS | ALLOW_MULTIMDS_SNAPS` = `0x12` (decimal 18). A flags value of `50` (decimal) = `0x32` = `ALLOW_SNAPS` + `ALLOW_MULTIMDS_SNAPS` + `ALLOW_STANDBY_REPLAY`. Note that `NOT_JOINABLE` at bit 0 means the filesystem is **not** accepting MDS daemons when set -- the display label "joinable" shown by `ceph fs get` is inverted for readability.

View the human-readable flags in the status output:

```bash
ceph fs get myfs
```

## Getting a Specific Filesystem's Settings

```bash
ceph fs get myfs
```

Sample output:

```text
Filesystem 'myfs' (1)
fs_name    myfs
metadata_pool    1
data_pools    [2]
...
```

## Checking Filesystem Compatibility Flags

CephFS maintains compatibility flags that determine which client and daemon versions can access the filesystem:

```bash
ceph fs get myfs | grep compat
```

Sample output:

```text
compat    compat={},rocompat={},incompat={1=base v0.20,2=client writeable ranges,...}
```

## Listing Filesystems in Rook

When using Rook, also check the `CephFilesystem` resources to see the declared state:

```bash
kubectl -n rook-ceph get cephfilesystem
```

Sample output:

```text
NAME     ACTIVEMDS   AGE   PHASE
myfs     1           90d   Ready
```

Cross-reference with the Ceph state to verify both agree.

## Summary

`ceph fs ls` lists all CephFS filesystems with their pool associations. Use `ceph fs status <name>` for a detailed operational view including MDS state, pool usage, and connected clients. `ceph fs dump` provides the raw filesystem map including flags and compatibility settings. In Rook deployments, also check `kubectl get cephfilesystem` to compare declared versus actual state.
