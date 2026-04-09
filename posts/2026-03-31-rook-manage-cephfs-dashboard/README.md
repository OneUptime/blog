# How to Manage CephFS from the Ceph Dashboard

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Dashboard, CephFS, Filesystem

Description: Use the Ceph Dashboard to create, monitor, and manage CephFS filesystems, MDS daemons, and filesystem quotas in your Rook-managed cluster.

---

## Overview

The CephFS section of the Ceph Dashboard allows you to view filesystem details, monitor MDS daemon health, browse filesystem directories, and view quotas without using the command line.

## Accessing CephFS Management

```bash
kubectl -n rook-ceph port-forward svc/rook-ceph-mgr-dashboard 8443:8443
# Navigate to: https://localhost:8443/#/cephfs
```

The filesystem list shows:
- Filesystem name
- Number of active and standby MDS daemons
- Data pool and metadata pool names
- Flags (joinable, allow_multimds_snaps)

## Creating a CephFS via Dashboard

Click "Create" in the File Systems section:

- **Name**: filesystem name
- **Metadata pool**: create new or select existing
- **Data pool**: create new or select existing

Rook equivalent YAML:

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
    - name: data0
      replicated:
        size: 3
  metadataServer:
    activeCount: 1
    activeStandby: true
```

## Monitoring MDS Daemons

The Dashboard shows MDS state for each filesystem:
- Active MDSs - serving client requests
- Standby MDSs - ready to take over on failure
- Standby-replay MDSs - warm standby replaying active MDS journal

CLI equivalent:

```bash
kubectl -n rook-ceph exec deploy/rook-ceph-tools -- ceph fs status myfs
kubectl -n rook-ceph exec deploy/rook-ceph-tools -- ceph mds stat
```

## Browsing the Filesystem

The Dashboard File Systems detail page includes a directory browser showing:
- Directory paths
- Size and number of files
- Quotas set on directories

## Setting Directory Quotas via CLI

The Dashboard shows quotas but CLI is needed to set them:

```bash
# Create subvolumes with size quotas
kubectl -n rook-ceph exec deploy/rook-ceph-tools -- \
  ceph fs subvolumegroup create myfs mygroup

kubectl -n rook-ceph exec deploy/rook-ceph-tools -- \
  ceph fs subvolume create myfs mysubvol --group-name mygroup --size 107374182400

# Verify quota
kubectl -n rook-ceph exec deploy/rook-ceph-tools -- \
  ceph fs subvolume info myfs mysubvol --group-name mygroup
```

## Managing MDS Active Count

Scale active MDS count from the Dashboard edit view or CLI:

```bash
# Increase to 2 active MDS for high concurrency
kubectl -n rook-ceph exec deploy/rook-ceph-tools -- \
  ceph fs set myfs max_mds 2

# Check new MDS layout
kubectl -n rook-ceph exec deploy/rook-ceph-tools -- \
  ceph fs status myfs
```

## Dashboard CephFS Metrics

Key metrics visible in the Dashboard:
- Client count (active CephFS mounts)
- Metadata ops/sec (getattr, readdir, etc.)
- Data throughput (read/write MB/s)

Monitor via CLI:

```bash
kubectl -n rook-ceph exec deploy/rook-ceph-tools -- \
  ceph tell mds.myfs-a perf dump

kubectl -n rook-ceph exec deploy/rook-ceph-tools -- \
  ceph fs perf stats
```

## Summary

The Ceph Dashboard CephFS section provides filesystem creation, MDS health monitoring, and directory browsing capabilities. MDS active count scaling and directory quota management still require CLI commands but Dashboard provides visibility into current states. Monitoring client counts and metadata ops per second helps identify when active MDS count needs to be increased for high-concurrency workloads.
