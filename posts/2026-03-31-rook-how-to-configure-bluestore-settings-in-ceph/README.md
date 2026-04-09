# How to Configure BlueStore Settings in Ceph

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, BlueStore, Performance, Storage, Kubernetes

Description: Learn how to configure BlueStore settings in Ceph including block device tuning, compression, cache sizes, and WAL/DB placement for optimal OSD performance.

---

## Overview

BlueStore is the default storage backend for Ceph OSDs, replacing the older FileStore. It provides native object storage, built-in compression, and checksumming. Tuning BlueStore settings can significantly improve performance and storage efficiency for different workload types.

## Configuring BlueStore via Rook

BlueStore settings are configured in the CephCluster CRD or through the `rook-config-override` ConfigMap. Settings take effect when OSDs are created or restarted.

## OSD Device Configuration

Specify separate WAL and DB devices for improved performance:

```yaml
apiVersion: ceph.rook.io/v1
kind: CephCluster
metadata:
  name: rook-ceph
  namespace: rook-ceph
spec:
  storage:
    useAllNodes: false
    nodes:
      - name: storage-node-1
        devices:
          - name: sda
            config:
              osdsPerDevice: "1"
              metadataDevice: "nvme0n1"
```

Placing BlueStore DB and WAL on NVMe while data is on HDD dramatically improves random I/O:

```yaml
spec:
  storage:
    nodes:
      - name: storage-node-1
        devices:
          - name: sdb
            config:
              metadataDevice: nvme0n1
          - name: sdc
            config:
              metadataDevice: nvme0n1
```

## Configuring BlueStore Parameters

Use the `rook-config-override` ConfigMap to set BlueStore parameters:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: rook-config-override
  namespace: rook-ceph
data:
  config: |
    [osd]
    bluestore_compression_mode = aggressive
    bluestore_compression_algorithm = snappy
    bluestore_cache_size_hdd = 4294967296
    bluestore_cache_size_ssd = 3221225472
    bluestore_min_alloc_size_hdd = 65536
    bluestore_min_alloc_size_ssd = 16384
    osd_memory_target = 4294967296
```

Apply the ConfigMap:

```bash
kubectl apply -f rook-config-override.yaml
```

## Enabling Compression

BlueStore supports multiple compression algorithms. Configure per-pool:

```bash
# Enable aggressive compression on a pool
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph osd pool set replicapool compression_mode aggressive

# Set the algorithm
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph osd pool set replicapool compression_algorithm lz4

# Set minimum blob size for compression to be applied
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph osd pool set replicapool compression_min_blob_size 8192
```

Check compression statistics:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph osd pool stats replicapool
```

## Tuning Cache Size

BlueStore maintains an in-memory cache for metadata and data. Tune based on available memory:

```bash
# Set cache size for HDD OSDs (4GB)
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph config set osd bluestore_cache_size_hdd 4294967296

# Set cache size for SSD OSDs (3GB)
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph config set osd bluestore_cache_size_ssd 3221225472
```

## Enabling Checksums

BlueStore checksums are enabled by default. Verify the checksum algorithm:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph config get osd bluestore_csum_type
```

Change to a faster algorithm if checksums are causing CPU overhead:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph config set osd bluestore_csum_type xxhash32
```

## Viewing BlueStore Statistics

Get BlueStore allocator statistics for an OSD:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph tell osd.0 perf dump
```

## Summary

Configuring BlueStore in Ceph involves tuning device placement (WAL/DB on fast media), compression settings (algorithm and mode per pool), cache sizes based on OSD memory, and checksum algorithms. Rook exposes these settings through the CephCluster storage configuration and the `rook-config-override` ConfigMap. Proper BlueStore tuning is essential for maximizing performance on both HDD and SSD-based Ceph deployments.
