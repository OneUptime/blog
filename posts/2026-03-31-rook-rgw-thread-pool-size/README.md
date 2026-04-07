# How to Configure rgw_thread_pool_size for RGW Performance

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, RGW, Performance, Thread, Object Storage

Description: Tune rgw_thread_pool_size in Ceph RGW to match your hardware concurrency and workload characteristics for optimal S3 API performance.

---

The `rgw_thread_pool_size` parameter controls the size of the worker thread pool used by the RGW beast frontend for async I/O processing. Getting this value right is critical for matching CPU resources to request concurrency.

## Default and Recommended Values

The default thread pool size is 512. For most deployments:

- **Small clusters (1-2 RGW instances):** 128-256 threads
- **Medium clusters (4+ RGW instances):** 512-1024 threads
- **High-throughput deployments:** 1024-2048 threads

A good starting point is 2x the number of CPU cores available to the RGW pod.

## Checking Current Thread Pool Size

```bash
ceph config get client.rgw rgw_thread_pool_size
```

## Setting the Thread Pool Size

```bash
# Set to 512 threads
ceph config set client.rgw rgw_thread_pool_size 512

# For a 32-core node
ceph config set client.rgw rgw_thread_pool_size 64
```

Note: More threads does not always mean better performance. Each thread consumes memory (stack size) and context switching overhead increases with thread count.

## Relationship with Frontend Configuration

For the beast frontend (the default since Luminous), `rgw_thread_pool_size` controls the worker thread pool that handles all async I/O processing. Note that `num_threads` is a CivetWeb-only option and is not valid for the beast frontend:

```bash
# Configure beast frontend port and the worker thread pool size
ceph config set client.rgw rgw_frontends "beast port=7480"
ceph config set client.rgw rgw_thread_pool_size 512
```

## Applying in Rook

Limit CPU and set thread pool size together for predictable performance:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: rook-config-override
  namespace: rook-ceph
data:
  config: |
    [client.rgw.my-store.a]
    rgw_thread_pool_size = 256
    rgw_frontends = beast port=7480
```

Also set resource limits in the CephObjectStore:

```yaml
apiVersion: ceph.rook.io/v1
kind: CephObjectStore
metadata:
  name: my-store
  namespace: rook-ceph
spec:
  gateway:
    instances: 2
    resources:
      requests:
        cpu: "4"
        memory: "4Gi"
      limits:
        cpu: "8"
        memory: "8Gi"
```

## Monitoring Thread Utilization

```bash
# Check active threads via the admin socket
kubectl -n rook-ceph exec -it deploy/rook-ceph-rgw-my-store-a -- \
  ceph daemon /var/run/ceph/ceph-client.rgw.*.asok perf dump | \
  python3 -m json.tool | grep -E "thread|active"

# OS-level thread count
kubectl -n rook-ceph exec -it deploy/rook-ceph-rgw-my-store-a -- \
  ls /proc/1/task | wc -l
```

## Summary

`rgw_thread_pool_size` controls the size of the worker thread pool used by the RGW beast frontend for async I/O processing. Set it to approximately 2x your available CPU cores per RGW instance. Apply resource limits in the Rook CephObjectStore spec to ensure predictable performance.
