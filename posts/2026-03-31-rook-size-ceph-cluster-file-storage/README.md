# How to Size a Ceph Cluster for File Storage

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, CephFS, File Storage, Capacity Planning, Kubernetes

Description: Learn how to size a Rook-Ceph cluster for CephFS file storage, covering metadata server scaling, data pool sizing, and workload-specific configuration.

---

## Overview

CephFS provides a POSIX-compliant distributed file system backed by Ceph's RADOS layer. Sizing for file storage involves not only data pool capacity but also metadata server (MDS) resources, which are critical for file system performance at scale. This guide covers capacity planning, MDS sizing, and pool configuration for CephFS workloads.

## CephFS Architecture

CephFS uses two pools:
- **Metadata pool**: stores directory trees, inodes, file metadata (replicated, latency-sensitive)
- **Data pool**: stores actual file contents (replicated or erasure-coded, capacity-optimized)

```text
Metadata pool size: typically 1-5% of data pool size
Data pool size: based on expected data capacity
```

## Capacity Calculation

For 30TB of usable file storage with 3x replication:

```text
Data pool raw: 30TB * 3 / 0.8 = 112.5TB
Metadata pool raw: 112.5TB * 0.02 = ~2.3TB (use SSD)
```

## Hardware Recommendations

```text
MDS nodes (dedicated or shared):
  CPU: 8-16 cores (MDS is CPU-bound for metadata ops)
  RAM: 32-64GB per active MDS (metadata cache)
  Storage: SSD for the metadata pool

OSD nodes for data:
  Drives: HDD for capacity-heavy file workloads
  Per-node: 8-16 drives
  Network: 10-25GbE
```

## CephFilesystem Configuration

```yaml
apiVersion: ceph.rook.io/v1
kind: CephFilesystem
metadata:
  name: cephfs
  namespace: rook-ceph
spec:
  metadataPool:
    replicated:
      size: 3
    deviceClass: ssd      # Always use SSD for metadata
  dataPools:
  - name: data0
    replicated:
      size: 3
    deviceClass: hdd
  metadataServer:
    activeCount: 2        # Active MDS instances
    activeStandby: true   # Standby for each active
    resources:
      limits:
        cpu: "8"
        memory: "32Gi"
      requests:
        cpu: "4"
        memory: "16Gi"
```

## Scaling MDS for Large File Counts

CephFS performance degrades when a single MDS handles too many inodes. Split the namespace using directory subtree pinning:

```bash
# Pin a directory subtree to MDS rank 1
kubectl exec -it -n rook-ceph deploy/rook-ceph-tools -- \
  setfattr -n ceph.dir.pin -v 1 /mnt/cephfs/team-a-data

# Verify current MDS load
kubectl exec -it -n rook-ceph deploy/rook-ceph-tools -- \
  ceph mds stat
```

## StorageClass for CephFS PVCs

```yaml
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: rook-cephfs
provisioner: rook-ceph.cephfs.csi.ceph.com
parameters:
  clusterID: rook-ceph
  fsName: cephfs
  pool: cephfs-data0
  csi.storage.k8s.io/provisioner-secret-name: rook-csi-cephfs-provisioner
  csi.storage.k8s.io/provisioner-secret-namespace: rook-ceph
  csi.storage.k8s.io/controller-expand-secret-name: rook-csi-cephfs-provisioner
  csi.storage.k8s.io/controller-expand-secret-namespace: rook-ceph
  csi.storage.k8s.io/node-stage-secret-name: rook-csi-cephfs-node
  csi.storage.k8s.io/node-stage-secret-namespace: rook-ceph
reclaimPolicy: Delete
allowVolumeExpansion: true
```

## Monitoring CephFS

```bash
# Check MDS health
kubectl exec -it -n rook-ceph deploy/rook-ceph-tools -- \
  ceph fs status cephfs

# Check metadata pool utilization
kubectl exec -it -n rook-ceph deploy/rook-ceph-tools -- \
  ceph df | grep cephfs

# Check MDS cache inode count
kubectl exec -it -n rook-ceph deploy/rook-ceph-tools -- \
  ceph tell mds.0 perf dump | python3 -c \
  "import sys,json; d=json.load(sys.stdin); print(d['mds_mem']['ino'])"
```

## CephFS Quotas

```bash
# Set a directory quota
kubectl exec -it -n rook-ceph deploy/rook-ceph-tools -- \
  setfattr -n ceph.quota.max_bytes -v 10737418240 /mnt/cephfs/tenant-a

# Check current quota
kubectl exec -it -n rook-ceph deploy/rook-ceph-tools -- \
  getfattr -n ceph.quota.max_bytes /mnt/cephfs/tenant-a
```

## Summary

Sizing Rook-Ceph for file storage requires separate attention to the metadata pool (SSD, replicated) and data pool (HDD, replicated or EC). MDS RAM is the primary constraint for metadata performance - allocate 32-64GB per active MDS. Use multiple active MDS instances with directory pinning when serving many tenants or large file counts, and monitor inode counts per MDS to proactively balance the metadata workload.
