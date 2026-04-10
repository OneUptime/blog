# How to Use the ceph fs Command Suite

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, CLI, CephFS, Filesystem, MDS, Operation

Description: Manage CephFS filesystems using the ceph fs commands to create, inspect, configure, and troubleshoot distributed file systems.

---

## Introduction

CephFS is Ceph's distributed filesystem. The `ceph fs` command suite provides tools for creating and managing filesystems, configuring MDS daemons, and diagnosing filesystem health. In Rook deployments, these commands complement the CephFilesystem CRD for operational tasks.

## Listing Filesystems

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- bash

# List all filesystems
ceph fs ls

# Detailed filesystem status
ceph fs status
```

Example `fs status` output:

```text
myfs - 3 clients
=====
RANK  STATE             MDS       ACTIVITY     DNS    INOS   DIRS   CAPS
 0    active            myfs-a    Reqs:    0   10.2k  10.5k  4.00k   191

POOL           TYPE     USED  AVAIL
myfs-metadata  metadata 41.9M   865G
myfs-data      data     19.2G   865G
```

## Getting Filesystem Details

```bash
ceph fs get myfs
ceph fs dump
```

## Creating a Filesystem

```bash
# Create data and metadata pools first
ceph osd pool create myfs-metadata 32
ceph osd pool create myfs-data 64
ceph osd pool application enable myfs-metadata cephfs
ceph osd pool application enable myfs-data cephfs

# Create the filesystem
ceph fs new myfs myfs-metadata myfs-data
```

In Rook, use the CephFilesystem CRD instead:

```yaml
apiVersion: ceph.rook.io/v1
kind: CephFilesystem
metadata:
  name: myfs
  namespace: rook-ceph
spec:
  metadataPool:
    replicated:
      size: 3
  dataPools:
  - replicated:
      size: 3
  metadataServer:
    activeCount: 1
    activeStandby: true
```

## Managing MDS Daemons

```bash
# Check MDS status
ceph mds stat

# Set standby count
ceph fs set myfs max_mds 2
ceph fs set myfs standby_count_wanted 1

# Fail an MDS (triggers standby promotion)
ceph mds fail myfs:0
```

## Setting Filesystem Quotas

Apply quotas at the directory level using extended attributes:

```bash
# Mount CephFS and set a quota
setfattr -n ceph.quota.max_bytes -v 10737418240 /mnt/cephfs/project-a
setfattr -n ceph.quota.max_files -v 100000 /mnt/cephfs/project-a

# Check quota
getfattr -n ceph.quota.max_bytes /mnt/cephfs/project-a
```

## Snapshots

```bash
# Create a snapshot
mkdir /mnt/cephfs/project-a/.snap/snapshot-2026-03-31

# List snapshots
ls /mnt/cephfs/project-a/.snap/

# Restore from snapshot
cp -r /mnt/cephfs/project-a/.snap/snapshot-2026-03-31/* /mnt/cephfs/project-a/
```

## Checking Client Connections

```bash
ceph fs status myfs
ceph tell mds.myfs-a client ls
```

## Summary

The `ceph fs` command suite provides management for all CephFS operations - from listing active filesystems and MDS health to setting quotas and managing snapshots. In Rook clusters, day-to-day operations like checking MDS status and filesystem usage are done via `ceph fs status`, while advanced configuration uses the full CLI suite for tuning beyond what the CRD exposes.
