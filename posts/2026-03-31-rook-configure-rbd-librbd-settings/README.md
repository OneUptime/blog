# How to Configure RBD librbd Settings

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, RBD, librbd, Configuration

Description: Learn how to tune RBD librbd client settings in Rook-Ceph to optimize I/O performance, cache behavior, and queue depth for block workloads.

---

## What Is librbd

`librbd` is the client-side library that applications and the Ceph CSI driver use to interact with RBD images. It handles I/O scheduling, client-side caching, request queuing, and feature negotiation with Ceph OSDs. Tuning librbd settings can significantly impact performance for database and high-throughput workloads.

In Rook-Ceph, librbd settings are applied via the Rook config override ConfigMap or directly to specific images using the `rbd config` command.

## Configuring via Rook Config Override

Create or update the Rook config override to apply librbd settings cluster-wide:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: rook-config-override
  namespace: rook-ceph
data:
  config: |
    [client]
    rbd_cache = true
    rbd_cache_size = 134217728
    rbd_cache_max_dirty = 100663296
    rbd_cache_target_dirty = 67108864
    rbd_cache_max_dirty_age = 1.0
    rbd_cache_writethrough_until_flush = true
    rbd_concurrent_management_ops = 20
    rbd_default_features = 125
    rbd_default_map_options = ms_mode=prefer-crc
```

## Key librbd Configuration Options

### I/O Cache Settings

Control the write-back cache behavior:

```text
rbd_cache = true                    # Enable client-side cache
rbd_cache_size = 134217728          # 128 MiB cache total
rbd_cache_max_dirty = 100663296     # 96 MiB dirty cap
rbd_cache_target_dirty = 67108864   # 64 MiB target dirty
rbd_cache_max_dirty_age = 1.0       # Flush after 1 second max
```

### Queue Depth Settings

Tune the number of concurrent in-flight requests:

```text
rbd_io_scheduler = simple
rbd_io_scheduler_simple_max_delay = 10
rbd_op_threads = 1
```

### Object Size Configuration

Configure the default object size for new images:

```bash
kubectl exec -it deploy/rook-ceph-tools -n rook-ceph -- \
  rbd config global set global rbd_default_order 22
```

Order 22 means 4 MiB objects (default). Order 23 means 8 MiB objects for sequential workloads.

## Applying Settings to a Specific Image

Override settings for a single image:

```bash
kubectl exec -it deploy/rook-ceph-tools -n rook-ceph -- \
  rbd config image set replicapool/myimage rbd_cache false

kubectl exec -it deploy/rook-ceph-tools -n rook-ceph -- \
  rbd config image get replicapool/myimage rbd_cache
```

List all config overrides on an image:

```bash
kubectl exec -it deploy/rook-ceph-tools -n rook-ceph -- \
  rbd config image list replicapool/myimage
```

## Applying Settings at the Pool Level

Set librbd defaults for all images in a pool:

```bash
kubectl exec -it deploy/rook-ceph-tools -n rook-ceph -- \
  rbd config pool set replicapool rbd_cache_size 268435456

kubectl exec -it deploy/rook-ceph-tools -n rook-ceph -- \
  rbd config pool list replicapool
```

## Recommended Settings for Database Workloads

For latency-sensitive databases, disable the write-back cache to ensure write durability:

```text
[client]
rbd_cache = false
rbd_readahead_trigger_requests = 10
rbd_readahead_max_bytes = 524288
```

## Summary

librbd settings in Rook-Ceph control the client-side behavior of RBD block devices, including caching, I/O scheduling, and queue depth. Apply global settings via the Rook config override ConfigMap, or override specific images and pools using `rbd config image set` and `rbd config pool set`. For database workloads, consider disabling write-back cache to prioritize write durability over throughput.
