# How to Configure Data Pool Settings for CephFS in Rook

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, CephFS, Data Pool, Erasure Coding, Filesystem Storage

Description: Learn how to configure CephFS data pool settings in Rook, including replication, erasure coding, multiple data pools, and compression options.

---

## What Is the CephFS Data Pool?

A CephFS filesystem stores actual file contents in one or more data pools. Unlike the metadata pool, data pools can use either replication or erasure coding, and a single filesystem can have multiple data pools for different storage tiers or use cases.

By default, new files are written to the default data pool. You can configure MDS to direct specific directories to alternate data pools.

## Basic Data Pool Configuration

```yaml
apiVersion: ceph.rook.io/v1
kind: CephFilesystem
metadata:
  name: myfs
  namespace: rook-ceph
spec:
  metadataPool:
    failureDomain: host
    replicated:
      size: 3
  dataPools:
    - name: replicated
      failureDomain: host
      replicated:
        size: 3
  metadataServer:
    activeCount: 1
    activeStandby: true
```

## Replicated Data Pool

A replicated data pool stores N copies of each data block:

```yaml
  dataPools:
    - name: replicated-data
      failureDomain: host
      replicated:
        size: 3
        requireSafeReplicaSize: true
      parameters:
        compression_mode: none
```

Use replicated pools for workloads that require high IOPS and low latency (databases, VM disks).

## Erasure Coded Data Pool

Erasure coding provides better storage efficiency than replication at the cost of some CPU overhead and latency. It is suitable for large files and sequential access patterns (archive, media storage).

```yaml
  dataPools:
    - name: ec-data
      failureDomain: host
      erasureCoded:
        dataChunks: 4      # Number of data shards
        codingChunks: 2    # Number of parity shards (tolerate 2 OSD failures)
      parameters:
        compression_mode: none
```

With `dataChunks: 4` and `codingChunks: 2`:
- You need at least 6 OSDs (4 + 2)
- Overhead is 50% (6 total vs 4 data)
- Compared to 3-way replication (200% overhead)

For large file workloads, this saves significant storage.

## Multiple Data Pools for Storage Tiering

Define multiple data pools for different tiers:

```yaml
apiVersion: ceph.rook.io/v1
kind: CephFilesystem
metadata:
  name: myfs
  namespace: rook-ceph
spec:
  metadataPool:
    deviceClass: ssd
    failureDomain: host
    replicated:
      size: 3
  dataPools:
    - name: ssd-data
      failureDomain: host
      deviceClass: ssd
      replicated:
        size: 3
    - name: hdd-data
      failureDomain: host
      deviceClass: hdd
      replicated:
        size: 3
    - name: archive-data
      failureDomain: host
      deviceClass: hdd
      erasureCoded:
        dataChunks: 4
        codingChunks: 2
  metadataServer:
    activeCount: 1
    activeStandby: true
```

## Setting Directory-Level Pool Policies via MDS

To route specific directory trees to a particular data pool, use CephFS layout pinning:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- bash

# Mount the filesystem (or use a client pod)
# Set pool for a directory subtree
setfattr -n ceph.dir.layout.pool -v myfs-hdd-data /mnt/cephfs/archive

# Verify the layout
getfattr -n ceph.dir.layout /mnt/cephfs/archive
```

New files created under `/mnt/cephfs/archive` will be stored in the `myfs-hdd-data` pool.

## Enabling Compression for Data Pools

```yaml
  dataPools:
    - name: compressed-data
      failureDomain: host
      replicated:
        size: 3
      parameters:
        compression_mode: aggressive
        compression_algorithm: snappy
```

Or apply via CLI:

```bash
ceph osd pool set myfs-hdd-data compression_mode aggressive
ceph osd pool set myfs-hdd-data compression_algorithm zstd
```

## Data Pool Tuning

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- bash

# Check data pool PG count
ceph osd pool get myfs-replicated-data pg_num

# Enable PG autoscaler for data pools
ceph osd pool set myfs-replicated-data pg_autoscale_mode on

# Check pool usage
ceph df | grep myfs

# List all pools for the filesystem
ceph fs ls
ceph osd dump | grep myfs
```

## Configuring the StorageClass for CephFS

```yaml
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: rook-cephfs
provisioner: rook-ceph.cephfs.csi.ceph.com
parameters:
  clusterID: rook-ceph
  fsName: myfs
  pool: myfs-replicated-data    # Which data pool to use
  csi.storage.k8s.io/provisioner-secret-name: rook-csi-cephfs-provisioner
  csi.storage.k8s.io/provisioner-secret-namespace: rook-ceph
  csi.storage.k8s.io/node-stage-secret-name: rook-csi-cephfs-node
  csi.storage.k8s.io/node-stage-secret-namespace: rook-ceph
reclaimPolicy: Delete
allowVolumeExpansion: true
```

Use the `pool` parameter to direct PVC data to a specific data pool.

## Verifying Data Pool Configuration

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- bash

# Show filesystem status including all pools
ceph fs status myfs

# List pool replicas
ceph osd pool get myfs-replicated-data size
ceph osd pool get myfs-replicated-data min_size

# Inspect erasure coded pool
ceph osd erasure-code-profile get myfs-ec-data-ec-profile
```

## Summary

CephFS data pool settings in Rook control how file content is stored within the filesystem. Replicated pools offer the best performance for random I/O workloads, while erasure-coded pools provide better storage efficiency for large sequential files. Use multiple data pools to create storage tiers and direct specific directory trees to them using CephFS layout pinning. Always configure the `pool` parameter in the CephFS StorageClass to direct PVC data to the appropriate pool for your workload's performance requirements.
