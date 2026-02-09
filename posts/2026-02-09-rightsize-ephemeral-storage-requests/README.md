# How to Right-Size Ephemeral Storage Requests for Container Logs and Temp Files

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Storage, Resource Management

Description: Learn how to properly size ephemeral storage requests and limits in Kubernetes to prevent pod evictions due to disk pressure while efficiently managing container logs, temporary files, and emptyDir volumes.

---

Ephemeral storage is often overlooked in Kubernetes resource planning, yet pods frequently get evicted due to exceeding ephemeral storage limits or node disk pressure. Containers use ephemeral storage for logs, temporary files, and emptyDir volumes. Understanding how to properly size these resources prevents unexpected evictions and ensures stable application operation.

This guide covers how to measure ephemeral storage usage, set appropriate requests and limits, and implement best practices for managing container logs and temporary files.

## Understanding Ephemeral Storage in Kubernetes

Ephemeral storage encompasses several writable areas in a container:

- **Container logs**: Written to /var/log/pods by the container runtime
- **Container writable layer**: Modified files in the container filesystem
- **emptyDir volumes**: Temporary volumes shared between containers
- **ConfigMap and Secret volumes**: Mounted configuration data
- **Container image layers**: Read-only layers (counted toward usage)

The kubelet monitors ephemeral storage usage and evicts pods when:
- Pod exceeds its ephemeral-storage limit
- Node disk usage exceeds eviction thresholds
- Node runs out of inodes

## Checking Current Ephemeral Storage Usage

View storage usage for running pods:

```bash
# Check ephemeral storage usage on nodes
kubectl get nodes --no-headers | while read node _; do
  echo "=== Node: $node ==="
  kubectl describe node $node | grep -A 5 "Allocated resources"
done

# View pod-level storage usage (requires metrics-server)
kubectl get --raw /api/v1/nodes/<node-name>/proxy/stats/summary | jq '.pods[] | {namespace: .podRef.namespace, name: .podRef.name, ephemeralStorage: .ephemeral_storage}'

# Check specific pod's storage usage
kubectl exec <pod-name> -- df -h /
```

For detailed analysis on a node:

```bash
# SSH to node or use nsenter
# Find pod's storage directory
sudo du -sh /var/lib/kubelet/pods/*

# Check container logs size
sudo du -sh /var/log/pods/*

# Check container writable layers
sudo du -sh /var/lib/containerd/io.containerd.content.v1.content/blobs/*
```

## Setting Ephemeral Storage Requests and Limits

Configure ephemeral storage similar to CPU and memory:

```yaml
# basic-storage-config.yaml
apiVersion: v1
kind: Pod
metadata:
  name: app-with-storage-limits
spec:
  containers:
  - name: app
    image: myapp:latest
    resources:
      requests:
        ephemeral-storage: "2Gi"
      limits:
        ephemeral-storage: "4Gi"
```

The kubelet enforces these limits by monitoring:
```
Total ephemeral usage = writable layer + logs + emptyDir volumes
```

## Sizing for Container Logs

Application logging is the primary consumer of ephemeral storage. Calculate log volume:

```bash
# Monitor log growth rate
POD_NAME=<pod-name>
CONTAINER_NAME=<container-name>

# Check current log size
kubectl exec $POD_NAME -c $CONTAINER_NAME -- du -h /var/log/

# Watch log growth over time
watch -n 60 'kubectl exec '$POD_NAME' -c '$CONTAINER_NAME' -- du -sh /var/log/'
```

For high-logging applications, calculate storage needs:

```
Log rate: 100 MB/hour
Retention: 24 hours
Required storage: 100 MB/hour * 24 = 2.4 GB

Add 50% buffer: 2.4 * 1.5 = 3.6 GB
Round up: 4 GB ephemeral-storage limit
```

## Implementing Log Rotation

Configure log rotation to control ephemeral storage usage:

```yaml
# deployment-with-log-rotation.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: web-app
spec:
  template:
    spec:
      containers:
      - name: app
        image: nginx:latest
        resources:
          requests:
            ephemeral-storage: "1Gi"
          limits:
            ephemeral-storage: "2Gi"
        volumeMounts:
        - name: logs
          mountPath: /var/log/nginx
      - name: log-rotator
        image: busybox:latest
        command:
        - sh
        - -c
        - |
          while true; do
            # Rotate logs every hour
            find /var/log/nginx -name "*.log" -type f -size +100M -exec truncate -s 0 {} \;
            sleep 3600
          done
        volumeMounts:
        - name: logs
          mountPath: /var/log/nginx
      volumes:
      - name: emptyDir
        emptyDir:
          sizeLimit: "2Gi"
```

Better yet, send logs to stdout/stderr and let the container runtime handle rotation:

```yaml
# app-stdout-logging.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: app-stdout-logs
spec:
  template:
    spec:
      containers:
      - name: app
        image: myapp:latest
        # Configure app to log to stdout/stderr
        env:
        - name: LOG_OUTPUT
          value: "stdout"
        resources:
          requests:
            ephemeral-storage: "500Mi"
          limits:
            ephemeral-storage: "1Gi"
```

## Configuring containerd Log Rotation

Configure the container runtime to rotate logs automatically:

```toml
# /etc/containerd/config.toml
version = 2

[plugins."io.containerd.grpc.v1.cri".containerd]
  [plugins."io.containerd.grpc.v1.cri".containerd.default_runtime]
    [plugins."io.containerd.grpc.v1.cri".containerd.default_runtime.options]
      # Maximum log file size before rotation
      max_container_log_line_size = 16384

[plugins."io.containerd.grpc.v1.cri"]
  # Enable log rotation
  max_container_log_size = "10Mi"
  max_container_log_files = 5
```

Restart containerd to apply:

```bash
sudo systemctl restart containerd
```

## Managing emptyDir Volume Size

emptyDir volumes count toward ephemeral storage. Set explicit size limits:

```yaml
# emptydir-with-limit.yaml
apiVersion: v1
kind: Pod
metadata:
  name: data-processor
spec:
  containers:
  - name: processor
    image: data-processor:latest
    resources:
      requests:
        ephemeral-storage: "5Gi"
      limits:
        ephemeral-storage: "10Gi"
    volumeMounts:
    - name: workspace
      mountPath: /tmp/work
    - name: cache
      mountPath: /tmp/cache
  volumes:
  - name: workspace
    emptyDir:
      sizeLimit: "5Gi"
  - name: cache
    emptyDir:
      sizeLimit: "3Gi"
      medium: Memory  # Use tmpfs (RAM) for cache
```

The `sizeLimit` prevents a single emptyDir from consuming all ephemeral storage.

## Handling Temporary Files

Applications often create temporary files that accumulate over time. Implement cleanup:

```yaml
# app-with-temp-cleanup.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: batch-processor
spec:
  template:
    spec:
      containers:
      - name: processor
        image: batch-app:latest
        resources:
          requests:
            ephemeral-storage: "2Gi"
          limits:
            ephemeral-storage: "5Gi"
        volumeMounts:
        - name: temp
          mountPath: /tmp
      initContainers:
      - name: cleanup-old-temp
        image: busybox:latest
        command:
        - sh
        - -c
        - |
          # Clean temp files older than 1 day
          find /tmp -type f -mtime +1 -delete
          # Clean empty directories
          find /tmp -type d -empty -delete
        volumeMounts:
        - name: temp
          mountPath: /tmp
      volumes:
      - name: temp
        emptyDir:
          sizeLimit: "3Gi"
```

Or use a sidecar for continuous cleanup:

```yaml
# continuous-temp-cleanup.yaml
- name: temp-cleaner
  image: busybox:latest
  command:
  - sh
  - -c
  - |
    while true; do
      # Remove files older than 6 hours
      find /tmp -type f -mmin +360 -delete
      # Remove files larger than 500MB
      find /tmp -type f -size +500M -delete
      sleep 600  # Run every 10 minutes
    done
  volumeMounts:
  - name: temp
    mountPath: /tmp
```

## Monitoring Ephemeral Storage Usage

Set up monitoring to track storage consumption:

```yaml
# storage-monitoring.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: prometheus-storage-rules
data:
  storage-rules.yml: |
    groups:
    - name: ephemeral_storage
      interval: 30s
      rules:
      - alert: HighEphemeralStorageUsage
        expr: |
          (kubelet_volume_stats_used_bytes{volume_type="ephemeral"} /
           kubelet_volume_stats_capacity_bytes{volume_type="ephemeral"}) > 0.8
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High ephemeral storage usage"
          description: "Pod {{ $labels.namespace }}/{{ $labels.pod }} using {{ $value | humanizePercentage }} of ephemeral storage"

      - alert: EphemeralStorageNearLimit
        expr: |
          kubelet_volume_stats_used_bytes{volume_type="ephemeral"} /
          kubelet_volume_stats_capacity_bytes{volume_type="ephemeral"} > 0.9
        for: 2m
        labels:
          severity: critical
        annotations:
          summary: "Ephemeral storage near limit"
          description: "Pod {{ $labels.namespace }}/{{ $labels.pod }} at {{ $value | humanizePercentage }} of ephemeral storage limit"
```

Query storage metrics in Prometheus:

```promql
# Current ephemeral storage usage per pod
kubelet_volume_stats_used_bytes{volume_type="ephemeral"}

# Storage usage percentage
kubelet_volume_stats_used_bytes{volume_type="ephemeral"} /
kubelet_volume_stats_capacity_bytes{volume_type="ephemeral"} * 100

# Pods using most ephemeral storage
topk(10, kubelet_volume_stats_used_bytes{volume_type="ephemeral"})
```

## Preventing Node Disk Pressure

Configure kubelet eviction thresholds for disk:

```yaml
# /var/lib/kubelet/config.yaml
apiVersion: kubelet.config.k8s.io/v1beta1
kind: KubeletConfiguration
evictionHard:
  nodefs.available: "10%"
  nodefs.inodesFree: "5%"
  imagefs.available: "15%"
evictionSoft:
  nodefs.available: "15%"
  nodefs.inodesFree: "10%"
  imagefs.available: "20%"
evictionSoftGracePeriod:
  nodefs.available: "2m"
  nodefs.inodesFree: "2m"
  imagefs.available: "2m"
```

Monitor node disk usage:

```bash
# Check node disk pressure conditions
kubectl describe nodes | grep -A 10 "Conditions:"

# View detailed node filesystem stats
kubectl get --raw /api/v1/nodes/<node-name>/proxy/stats/summary | jq '.node.fs'
```

## Implementing Storage Quotas

Use ResourceQuotas to limit total ephemeral storage per namespace:

```yaml
# namespace-storage-quota.yaml
apiVersion: v1
kind: ResourceQuota
metadata:
  name: storage-quota
  namespace: production
spec:
  hard:
    requests.ephemeral-storage: "100Gi"
    limits.ephemeral-storage: "200Gi"
```

Check quota usage:

```bash
kubectl describe resourcequota storage-quota -n production
```

## Right-Sizing Strategy

Follow this process to determine appropriate ephemeral storage sizes:

1. **Measure baseline usage**:
```bash
# Run application for 24-48 hours
# Collect storage metrics every 15 minutes
kubectl exec <pod> -- du -sh /
```

2. **Calculate P95 usage**:
```
P95 usage from metrics: 1.8 GB
```

3. **Add buffer for growth**:
```
Request: P95 * 1.2 = 2.16 GB → 2.5 GB
Limit: P95 * 2.0 = 3.6 GB → 4 GB
```

4. **Test under load**:
```bash
# Deploy with new limits
# Run load test and monitor storage
```

5. **Adjust based on observations**:
```yaml
resources:
  requests:
    ephemeral-storage: "2.5Gi"
  limits:
    ephemeral-storage: "4Gi"
```

Properly sizing ephemeral storage prevents pod evictions while avoiding overallocation of node disk space. Monitor storage usage patterns, implement log rotation, set explicit emptyDir size limits, and clean up temporary files regularly. Start with conservative limits based on measured usage and tune based on actual consumption in production.
