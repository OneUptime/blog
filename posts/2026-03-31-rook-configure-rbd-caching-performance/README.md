# How to Configure RBD Caching for Performance

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, RBD, Caching, Performance

Description: Configure RBD caching in Rook to reduce latency and improve throughput by tuning writeback cache size, dirty limits, and persistent cache settings for block volumes.

---

## RBD Caching Overview

Ceph RBD provides two caching mechanisms: the in-process librbd cache and the persistent cache on a local SSD. The in-process cache buffers reads and writes in the application's memory space. The persistent cache survives process restarts and provides a durable local acceleration layer.

## Enabling In-Process Writeback Cache

Enable writeback caching globally for all RBD clients:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph config set client rbd_cache true

kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph config set client rbd_cache_writethrough_until_flush true
```

The `rbd_cache_writethrough_until_flush` option starts in safe writethrough mode and switches to writeback only after the first explicit flush, protecting against power failures.

## Cache Size Tuning

Configure cache size based on available memory per workload:

```bash
# 128 MB total cache
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph config set client rbd_cache_size 134217728

# Dirty data limit - writes held in cache before flush
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph config set client rbd_cache_max_dirty 100663296

# Target dirty - Ceph starts flushing when this is reached
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph config set client rbd_cache_target_dirty 67108864
```

Dirty data must be less than total cache size. The ratio `max_dirty / cache_size` should be around 0.75.

## Per-Image Cache Override

Override cache settings for a specific RBD image:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  rbd config image set rbd/my-volume rbd_cache true

kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  rbd config image set rbd/my-volume rbd_cache_size 268435456
```

## Persistent Cache (pwl_cache)

For applications that survive process restarts, use the persistent write log cache backed by a local SSD or PMEM. First enable the cache plugin:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph config set client rbd_plugins pwl_cache

kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  rbd config image set rbd/my-volume rbd_persistent_cache_mode ssd

kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  rbd config image set rbd/my-volume rbd_persistent_cache_path /var/cache/rbd

kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  rbd config image set rbd/my-volume rbd_persistent_cache_size 1073741824
```

## Cache Configuration in StorageClass

RBD caching is configured at the Ceph config level, not through the StorageClass. However, the following StorageClass includes filesystem mount options that complement RBD caching for better performance:

```yaml
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: rbd-cached
provisioner: rook-ceph.rbd.csi.ceph.com
parameters:
  clusterID: rook-ceph
  pool: replicapool
  imageFormat: "2"
  imageFeatures: layering
  csi.storage.k8s.io/provisioner-secret-name: rook-csi-rbd-provisioner
  csi.storage.k8s.io/provisioner-secret-namespace: rook-ceph
  csi.storage.k8s.io/node-stage-secret-name: rook-csi-rbd-node
  csi.storage.k8s.io/node-stage-secret-namespace: rook-ceph
  "csi.storage.k8s.io/fstype": ext4
mountOptions:
  - noatime
  - nodiratime
```

## Monitoring Cache Effectiveness

Check cache hit statistics:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  rbd perf image iostat
```

Look for `read_bytes` and `write_bytes` columns to monitor I/O throughput reaching the OSDs. Lower OSD-level I/O relative to application-level I/O indicates effective caching.

## Summary

RBD caching reduces storage latency by serving repeated reads from memory and batching writes before sending them to OSDs. The writeback cache delivers the best performance but requires careful dirty data limits to prevent data loss. For workloads requiring durability across application restarts, the persistent cache on a local SSD provides similar acceleration with crash safety.
