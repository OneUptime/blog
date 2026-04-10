# How to Configure RGW Thread Pool for Optimal Throughput

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, RGW, Performance, Configuration

Description: Configure the Ceph RGW thread pool size in Rook to achieve optimal throughput by balancing thread count against CPU and memory resources for your workload type.

---

## Why Thread Pool Size Matters

RGW uses a thread pool to handle incoming HTTP requests. Too few threads causes request queuing under load; too many wastes CPU context-switching overhead and exhausts memory. The optimal size depends on whether your workload is CPU-bound (encryption, compression), I/O-bound (large objects), or latency-sensitive (many small objects).

## Default and Maximum Thread Counts

Check the current thread pool size:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph config get client.rgw rgw_thread_pool_size
```

The default is typically 512. For high-concurrency workloads, increase it:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph config set client.rgw rgw_thread_pool_size 1024
```

## Sizing by Workload Type

**Small object, high IOPS:** Use a large thread pool to handle many concurrent short-lived requests:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph config set client.rgw rgw_thread_pool_size 2048
```

**Large object, high throughput:** Fewer but longer-running threads prevent excessive context switching:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph config set client.rgw rgw_thread_pool_size 256

kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph config set client.rgw rgw_frontends \
    "beast port=80 num_threads=256 request_timeout_ms=600000"
```

## Matching Threads to CPU and Memory

A safe rule of thumb: `thread_pool_size = CPU_cores * 50` for I/O-bound workloads, `CPU_cores * 10` for CPU-bound workloads.

Update the Rook CephObjectStore resource requests to match:

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
        cpu: "8"
        memory: "16Gi"
      limits:
        cpu: "16"
        memory: "32Gi"
```

Each thread consumes approximately 8 MB of stack memory (the default Linux thread stack size). 1024 threads = approximately 8 GB of stack memory required, plus additional heap overhead per connection.

## Per-Instance Tuning

When running multiple RGW instances, configure them independently using per-instance config keys:

```bash
# For a specific RGW instance
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph config set client.rgw.my-store.a rgw_thread_pool_size 1024

kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph config set client.rgw.my-store.b rgw_thread_pool_size 1024
```

## Monitoring Thread Pool Saturation

Check if threads are queuing up using RGW metrics:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph tell client.rgw.my-store.a perf dump | \
  python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('throttle-rgw_ops'))"
```

Check via Prometheus:

```text
ceph_rgw_qlen > 0
```

A non-zero queue length means the thread pool is saturated - increase thread count or add RGW instances.

## Summary

RGW thread pool sizing is a balance between concurrency needs and resource consumption. Small object workloads benefit from large thread pools to serve many concurrent short requests, while large object workloads need fewer threads with longer timeouts. Monitor queue length metrics to detect saturation and scale thread count or add RGW instances accordingly.
