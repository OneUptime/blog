# How to Create CephFS Subvolumes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ceph, Rook, CephFS, Subvolume, Filesystem, Storage, CLI

Description: Create and configure CephFS subvolumes to provide isolated, quota-enforced filesystem namespaces within a single CephFS volume for multi-tenant use.

---

CephFS subvolumes provide isolated directory namespaces within a CephFS filesystem. Each subvolume gets its own quota, layout, and access path, making them ideal for multi-tenant shared storage where you want to isolate tenants without running separate CephFS filesystems.

## What is a CephFS Subvolume

A subvolume is a directory within CephFS that:
- Has an independently configurable quota
- Can have a custom data pool layout
- Gets a unique path that can be shared with clients directly
- Is managed via the `ceph fs subvolume` CLI or CephFS volume manager

## Prerequisites

```bash
# Verify CephFS is deployed and healthy
ceph fs status cephfs
ceph mds stat
```

## Creating a Basic Subvolume

```bash
# Create a subvolume named "tenant1" in the "cephfs" filesystem
ceph fs subvolume create cephfs tenant1

# Create with a size quota (10 GB)
ceph fs subvolume create cephfs tenant2 --size 10737418240

# Verify creation
ceph fs subvolume ls cephfs
```

## Getting the Subvolume Path

After creation, get the absolute path within the CephFS mount to share with the client:

```bash
# Get the path for the subvolume
ceph fs subvolume getpath cephfs tenant1
# Output: /volumes/_nogroup/tenant1/<uuid>
```

## Mounting a Subvolume

```bash
# Mount only the subvolume directory (not the whole filesystem)
SUBVOL_PATH=$(ceph fs subvolume getpath cephfs tenant1)

mount -t ceph mon1:6789,mon2:6789,mon3:6789:${SUBVOL_PATH} \
  /mnt/tenant1 \
  -o name=tenant1,secret=<cephx-key>
```

## Creating a Subvolume with Custom Options

```bash
# Create with specific data pool and mode
ceph fs subvolume create cephfs analytics \
  --size 53687091200 \
  --pool_layout cephfs.data.fast \
  --mode 0755 \
  --uid 1000 \
  --gid 1000

# Create in a specific subvolume group
ceph fs subvolume create cephfs webdata \
  --group_name production \
  --size 21474836480
```

## Creating a Subvolume with Namespace Isolation

For stronger isolation, create a subvolume with its own RADOS namespace:

```bash
ceph fs subvolume create cephfs isolated-tenant \
  --namespace-isolated \
  --size 10737418240
```

## Listing and Inspecting Subvolumes

```bash
# List all subvolumes
ceph fs subvolume ls cephfs

# Get detailed info about a subvolume
ceph fs subvolume info cephfs tenant1
```

Example output:

```json
{
    "atime": "2026-03-31 10:00:00",
    "bytes_pcent": "0.00",
    "bytes_quota": 10737418240,
    "bytes_used": 0,
    "created_at": "2026-03-31 10:00:00",
    "data_pool": "cephfs.data",
    "features": ["snapshot-clone", "snapshot-autoprotect", "snapshot-retention"],
    "gid": 0,
    "mode": 493,
    "mon_addrs": ["10.0.0.1:6789"],
    "path": "/volumes/_nogroup/tenant1/abc123",
    "pool_namespace": "",
    "state": "complete",
    "type": "subvolume",
    "uid": 0
}
```

## Summary

CephFS subvolumes provide lightweight, quota-enforced filesystem namespaces within a single CephFS deployment. Creating a subvolume takes a single command and returns an absolute path that can be given directly to clients for mounting. Size quotas, custom data pools, and namespace isolation make subvolumes suitable for multi-tenant scenarios where complete filesystem separation is not required but data isolation and quota enforcement are.
