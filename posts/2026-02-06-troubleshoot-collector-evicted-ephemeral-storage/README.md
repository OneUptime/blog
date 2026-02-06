# How to Troubleshoot Collector Pods Being Evicted Due to Ephemeral Storage Limits from Persistent Queue Usage

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Kubernetes, Ephemeral Storage, Persistent Queue

Description: Resolve Collector pod evictions caused by ephemeral storage usage exceeding limits when using persistent queue storage.

The OpenTelemetry Collector's persistent queue feature is great for preventing data loss during backend outages. But if the queue writes to the container's ephemeral storage (the default writable layer), and Kubernetes has ephemeral storage limits enabled, your Collector pods will get evicted when the queue grows too large.

## The Eviction Scenario

```bash
# Check pod events for eviction
kubectl describe pod otel-collector-xyz -n observability | grep -A5 "Events"

# You might see:
# Warning  Evicted  2m  kubelet  The node was low on resource: ephemeral-storage.
# Container collector was using 2Gi, which exceeds its request of 1Gi.

# Or check node conditions
kubectl describe node my-node | grep -A3 "Conditions"
# DiskPressure  True  ...  kubelet has disk pressure
```

## Why This Happens

When you configure the Collector's persistent queue with `file_storage`, it writes to a local directory. If that directory is within the container's filesystem (not a separate volume), it counts against the pod's ephemeral storage:

```yaml
# This configuration writes queue data to the container filesystem
extensions:
  file_storage:
    directory: /tmp/otelcol/queue  # This is ephemeral storage!

exporters:
  otlp:
    endpoint: "backend:4317"
    sending_queue:
      enabled: true
      storage: file_storage  # Queue data goes to /tmp/otelcol/queue
```

During a backend outage, the queue accumulates data on disk. If the outage lasts long enough, the disk usage exceeds the ephemeral storage limit, and Kubernetes evicts the pod. This creates a cascading failure: the pod restarts, the queue is lost, and the cycle repeats.

## Fix 1: Use a Persistent Volume for Queue Storage

Mount a PersistentVolumeClaim for the queue directory so it does not count against ephemeral storage:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: otel-collector
spec:
  template:
    spec:
      containers:
        - name: collector
          volumeMounts:
            - name: queue-storage
              mountPath: /var/lib/otelcol/queue
      volumes:
        - name: queue-storage
          persistentVolumeClaim:
            claimName: otel-collector-queue

---
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: otel-collector-queue
  namespace: observability
spec:
  accessModes:
    - ReadWriteOnce
  resources:
    requests:
      storage: 10Gi  # Size based on expected queue growth
  storageClassName: standard  # Use your cluster's storage class
```

Update the Collector config to use the mounted volume:

```yaml
extensions:
  file_storage:
    directory: /var/lib/otelcol/queue  # Points to the PVC mount
    timeout: 10s
    compaction:
      on_start: true
      on_rebound: true
      directory: /var/lib/otelcol/queue/compaction
```

## Fix 2: Use emptyDir with a Size Limit

If you do not want to manage PVCs, use an emptyDir volume with a size limit. This is still ephemeral but gives you more control:

```yaml
volumes:
  - name: queue-storage
    emptyDir:
      sizeLimit: 5Gi  # Limit the volume size
```

Note that emptyDir with `sizeLimit` still counts against the node's ephemeral storage. It just prevents the volume from growing unbounded. The pod will still be evicted if the node runs low on disk.

## Fix 3: Increase Ephemeral Storage Limits

If the queue needs ephemeral storage and PVCs are not an option, increase the limits:

```yaml
resources:
  requests:
    ephemeral-storage: 5Gi
  limits:
    ephemeral-storage: 10Gi
```

Make sure the node has enough disk space to accommodate these limits.

## Fix 4: Limit Queue Size in the Collector Config

Cap the queue size so it cannot grow beyond your storage budget:

```yaml
exporters:
  otlp:
    endpoint: "backend:4317"
    sending_queue:
      enabled: true
      storage: file_storage
      queue_size: 1000  # Limit the number of batches in the queue

extensions:
  file_storage:
    directory: /var/lib/otelcol/queue
    timeout: 10s
    compaction:
      on_start: true
      on_rebound: true
      directory: /var/lib/otelcol/queue/compaction
      max_transaction_size: 65536
```

## Fix 5: For DaemonSets, Use hostPath

DaemonSet Collectors can use hostPath volumes to write to the node's filesystem directly. This is outside the ephemeral storage tracking:

```yaml
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: otel-collector
spec:
  template:
    spec:
      containers:
        - name: collector
          volumeMounts:
            - name: queue-storage
              mountPath: /var/lib/otelcol/queue
      volumes:
        - name: queue-storage
          hostPath:
            path: /var/lib/otelcol/queue
            type: DirectoryOrCreate
```

Be aware that hostPath data persists across pod restarts but is node-local. If the pod gets scheduled to a different node (not applicable for DaemonSets, but important for Deployments), the data is gone.

## Monitoring Disk Usage

Set up monitoring to catch disk issues before eviction:

```bash
# Check current ephemeral storage usage per pod
kubectl get pods -n observability -o json | \
  jq '.items[] | {name: .metadata.name, ephemeral: .status.ephemeralContainerStatuses}'

# Monitor the queue directory size
kubectl exec -it otel-collector-pod -- du -sh /var/lib/otelcol/queue
```

Add a Prometheus alert:

```yaml
# Alert when queue storage exceeds 80% of its capacity
- alert: OtelQueueStorageHigh
  expr: |
    kubelet_volume_stats_used_bytes{persistentvolumeclaim="otel-collector-queue"}
    / kubelet_volume_stats_capacity_bytes{persistentvolumeclaim="otel-collector-queue"}
    > 0.8
  for: 5m
  labels:
    severity: warning
```

The persistent queue is essential for reliable telemetry delivery, but it needs proper storage backing. Always use a PVC or hostPath for queue data in production. Relying on ephemeral storage for a growing queue is asking for evictions.
