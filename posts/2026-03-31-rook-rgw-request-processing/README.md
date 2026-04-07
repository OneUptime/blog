# How to Configure RGW Request Processing Parameters

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, RGW, Performance, Configuration, Object Storage

Description: Tune Ceph RGW request processing parameters including queue depths, socket backlogs, and connection limits to handle high concurrency workloads.

---

Ceph RGW exposes several parameters that control how incoming HTTP requests are queued and dispatched. Tuning these prevents request drops under high load and reduces latency spikes.

## Key Request Processing Parameters

```bash
# Check current settings
ceph config get client.rgw rgw_max_concurrent_requests
ceph config get client.rgw rgw_thread_pool_size
ceph config get client.rgw rgw_op_thread_timeout
```

## Configuring Maximum Concurrent Requests

`rgw_max_concurrent_requests` limits the number of requests processed in parallel per RGW instance:

```bash
# Default is 1024, increase for high-throughput deployments
ceph config set client.rgw rgw_max_concurrent_requests 2048
```

## Setting the Request Queue Depth

Control how many requests can wait in the accept queue:

```bash
# Set the connection accept queue size
ceph config set client.rgw rgw_frontends "beast port=7480 max_connection_backlog=512"
```

## Configuring Connection-Level Tuning

```bash
# Maximum size of a single request body (bytes)
ceph config set client.rgw rgw_max_put_size 5368709120

# Maximum RADOS write window size for PUT operations (bytes)
ceph config set client.rgw rgw_put_obj_max_window_size 67108864

# Maximum number of buckets per user
ceph config set client.rgw rgw_user_max_buckets 1000
```

## Applying in Rook

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: rook-config-override
  namespace: rook-ceph
data:
  config: |
    [client.rgw.my-store.a]
    rgw_max_concurrent_requests = 2048
    rgw_max_put_size = 5368709120
    rgw_put_obj_max_window_size = 67108864
```

Apply and restart:

```bash
kubectl apply -f rook-config-override.yaml
kubectl -n rook-ceph rollout restart deployment rook-ceph-rgw-my-store-a
```

## Monitoring Request Processing

Use the perf dump interface to monitor request queue metrics:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-rgw-my-store-a -- \
  ceph daemon /var/run/ceph/ceph-client.rgw.*.asok perf dump | \
  python3 -m json.tool | grep -E "qactive|put_obj|get_obj"
```

Key metrics to watch:
- `qactive` - currently active requests in queue
- `put_obj_ops` - total PUT object operations
- `get_obj_ops` - total GET object operations

## Scaling with Multiple Instances

For very high throughput, scale RGW instances horizontally:

```yaml
apiVersion: ceph.rook.io/v1
kind: CephObjectStore
metadata:
  name: my-store
  namespace: rook-ceph
spec:
  gateway:
    instances: 4
    resources:
      requests:
        cpu: "2"
        memory: "4Gi"
```

## Summary

Tuning RGW request processing parameters - particularly `rgw_max_concurrent_requests`, thread pool size, and PUT object limits - prevents request drops under high concurrency. For sustained high throughput, combine parameter tuning with horizontal scaling of RGW instances using the Rook `CephObjectStore` `instances` field.
