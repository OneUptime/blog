# How to Configure Ephemeral Storage Limits for Preventing Disk Pressure

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Resource Management, Storage

Description: Learn how to configure ephemeral storage limits in Kubernetes to prevent disk pressure events and ensure stable pod operations across your cluster.

---

Disk pressure events can cripple your Kubernetes cluster, causing pod evictions and service disruptions. When nodes run out of ephemeral storage, the kubelet starts evicting pods to reclaim space, often in unpredictable ways. Configuring ephemeral storage limits gives you control over how containers consume local disk space and prevents runaway processes from impacting cluster stability.

Ephemeral storage includes container writable layers, logs written to stdout/stderr, and emptyDir volumes. Without proper limits, a single misbehaving container can fill up node storage and trigger evictions for unrelated workloads.

## Understanding Ephemeral Storage in Kubernetes

Kubernetes tracks ephemeral storage consumption at both the pod and node level. The kubelet monitors local storage usage and compares it against configured thresholds. When usage exceeds these thresholds, the node enters disk pressure state and begins evicting pods based on their storage consumption and Quality of Service (QoS) class.

There are three types of ephemeral storage:

**Container writable layer**: Every container has a writable layer on top of its image layers. Applications writing to the container filesystem consume this storage.

**Log storage**: Container logs written to stdout/stderr are stored on the node's filesystem until rotated or cleaned up.

**emptyDir volumes**: Temporary volumes that exist for the lifetime of a pod share the node's ephemeral storage pool.

## Setting Ephemeral Storage Requests and Limits

You configure ephemeral storage similar to CPU and memory resources using the `ephemeral-storage` resource name. Requests define the minimum storage a pod needs, while limits cap the maximum consumption.

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: web-app
spec:
  containers:
  - name: nginx
    image: nginx:1.21
    resources:
      requests:
        ephemeral-storage: "2Gi"
      limits:
        ephemeral-storage: "4Gi"
```

This configuration tells the scheduler that the pod needs at least 2Gi of ephemeral storage and prevents it from using more than 4Gi. The kubelet enforces these limits by monitoring the container's writable layer and any emptyDir volumes.

## Handling emptyDir Volume Storage

When you use emptyDir volumes, their storage consumption counts against the pod's ephemeral storage limit. If you specify a `sizeLimit` on the emptyDir, Kubernetes tracks that volume's usage independently.

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: cache-pod
spec:
  containers:
  - name: app
    image: myapp:latest
    volumeMounts:
    - name: cache
      mountPath: /cache
    resources:
      limits:
        ephemeral-storage: "5Gi"
  volumes:
  - name: cache
    emptyDir:
      sizeLimit: "3Gi"
```

In this example, the cache volume can use up to 3Gi, and the total pod ephemeral storage (including the container writable layer and logs) cannot exceed 5Gi. The kubelet will evict the pod if either limit is breached.

## Configuring Node Eviction Thresholds

Beyond pod-level limits, you should configure kubelet eviction thresholds to protect nodes from running out of disk space entirely. These settings prevent nodes from becoming unresponsive due to full disks.

Add these flags to your kubelet configuration:

```yaml
# kubelet-config.yaml
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

Hard eviction thresholds trigger immediate pod eviction when crossed. Soft eviction thresholds allow a grace period before evicting pods, giving applications time to clean up or shut down gracefully.

The `nodefs` refers to the filesystem used for ephemeral storage and logs, while `imagefs` refers to the filesystem used for container images and writable layers (if separate).

## Monitoring Ephemeral Storage Usage

Deploy monitoring to track ephemeral storage consumption before it becomes a problem. The kubelet exposes metrics through its `/metrics` endpoint that you can scrape with Prometheus.

```yaml
# ServiceMonitor for kubelet metrics
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: kubelet
  namespace: monitoring
spec:
  endpoints:
  - port: https-metrics
    scheme: https
    tlsConfig:
      insecureSkipVerify: true
    bearerTokenFile: /var/run/secrets/kubernetes.io/serviceaccount/token
    relabelings:
    - sourceLabels: [__metrics_path__]
      targetLabel: metrics_path
  namespaceSelector:
    matchNames:
    - kube-system
  selector:
    matchLabels:
      app.kubernetes.io/name: kubelet
```

Create alerts based on storage consumption trends:

```yaml
# PrometheusRule for ephemeral storage alerts
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: ephemeral-storage-alerts
spec:
  groups:
  - name: ephemeral-storage
    interval: 30s
    rules:
    - alert: PodNearEphemeralStorageLimit
      expr: |
        (kubelet_volume_stats_used_bytes / kubelet_volume_stats_capacity_bytes) > 0.8
      for: 5m
      labels:
        severity: warning
      annotations:
        summary: "Pod {{ $labels.namespace }}/{{ $labels.pod }} using 80% of ephemeral storage"
    - alert: NodeDiskPressure
      expr: |
        kube_node_status_condition{condition="DiskPressure",status="true"} == 1
      for: 1m
      labels:
        severity: critical
      annotations:
        summary: "Node {{ $labels.node }} is under disk pressure"
```

## Best Practices for Ephemeral Storage Management

**Set limits for all production pods**: Don't rely on default behavior. Explicitly configure ephemeral storage limits to prevent unbounded growth.

**Size based on actual usage**: Monitor your applications in development and staging environments to understand their storage patterns. Add a buffer (20-30%) to account for spikes.

**Use sizeLimit for emptyDir volumes**: This provides more granular control and clearer visibility into what's consuming storage.

**Implement log rotation**: Configure container runtime log rotation to prevent logs from filling up disk space. Most container runtimes support max file size and max file count settings.

**Regular cleanup**: Schedule CronJobs to clean up temporary files or implement application-level cleanup routines.

## Debugging Ephemeral Storage Issues

When a pod is evicted due to ephemeral storage, check the kubelet logs on the node:

```bash
# Check kubelet logs for eviction events
journalctl -u kubelet -n 200 | grep -i evict

# Check node filesystem usage
df -h

# Check inode usage (often overlooked)
df -i

# Check specific pod storage usage
kubectl exec -it <pod-name> -- du -sh /*
```

You can also describe the node to see disk pressure conditions:

```bash
kubectl describe node <node-name> | grep -A 5 Conditions
```

## Recovery from Disk Pressure

If a node enters disk pressure, you need to free up space quickly:

```bash
# Remove unused images
crictl rmi --prune

# Delete completed pods
kubectl delete pods --field-selector=status.phase=Succeeded

# Clean up old container logs
find /var/log/pods -name "*.log" -mtime +7 -delete
```

After recovering, review your storage limits and eviction thresholds to prevent recurrence.

## Conclusion

Ephemeral storage limits are essential for maintaining cluster stability. They prevent individual workloads from monopolizing node storage and triggering cascading failures. By setting appropriate requests and limits, configuring node-level eviction thresholds, and implementing monitoring, you create a robust defense against disk pressure events. The small investment in proper configuration pays dividends in operational stability and predictable behavior.
