# How to Fix Kubernetes Pod Evictions Caused by Node Memory Pressure and DiskPressure

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Resource Management, Node Management

Description: Learn how to diagnose and resolve pod evictions caused by node memory pressure and disk pressure in Kubernetes, including prevention strategies and resource management best practices.

---

Kubernetes evicts pods when nodes run out of critical resources like memory or disk space. These evictions protect node stability by terminating pods before resource exhaustion crashes system processes. However, unexpected evictions disrupt applications and can cascade into broader outages if multiple pods fail simultaneously.

Understanding kubelet eviction mechanisms and implementing proper resource management prevents these disruptions. This guide covers diagnosing eviction causes, tuning eviction thresholds, and implementing strategies that keep nodes healthy without sacrificing application availability.

## Understanding Kubelet Eviction Policies

The kubelet monitors node resource usage and triggers evictions when consumption crosses configured thresholds. Two types of thresholds exist: hard thresholds that trigger immediate evictions, and soft thresholds that allow grace periods before evicting pods.

Memory pressure occurs when available memory drops below thresholds. Disk pressure happens when filesystem usage or inodes exceed limits. The kubelet tracks multiple disk metrics including the root filesystem, the container image filesystem, and volume filesystems.

When eviction triggers, kubelet selects pods based on priority and resource usage. Pods exceeding resource requests get evicted first, followed by pods using fewer resources relative to their requests. Critical system pods with specific priority classes never get evicted.

## Identifying Pods Evicted Due to Resource Pressure

Check for evicted pods across your cluster.

```bash
# Find evicted pods
kubectl get pods --all-namespaces --field-selector status.phase=Failed

# Filter for eviction-specific reasons
kubectl get pods -A -o json | \
  jq -r '.items[] | select(.status.reason == "Evicted") |
  "\(.metadata.namespace)/\(.metadata.name): \(.status.message)"'

# Example output:
# default/myapp-7d9f8c6b5-x2h4k: The node was low on resource: memory.
# production/api-6f8d9c7b4-k3j2h: The node had condition: [DiskPressure].
```

View detailed eviction information from pod events.

```bash
# Check pod description for eviction details
kubectl describe pod myapp-7d9f8c6b5-x2h4k -n default

# Look for events like:
# Warning  Evicted  2m  kubelet  The node was low on resource: memory.
# Container app was using 1024Mi, which exceeds its request of 512Mi.
```

Examine node conditions to understand current resource state.

```bash
# Check node conditions
kubectl describe node worker-1 | grep -A 10 Conditions

# Look for:
# MemoryPressure   True
# DiskPressure     True
```

## Diagnosing Memory Pressure Evictions

Memory pressure evictions happen when node memory usage exceeds thresholds. Check kubelet configuration for eviction thresholds.

```bash
# View kubelet config on the node
ssh worker-1
sudo cat /var/lib/kubelet/config.yaml | grep -A 10 eviction

# Default thresholds:
# evictionHard:
#   memory.available: 100Mi
# evictionSoft:
#   memory.available: 200Mi
# evictionSoftGracePeriod:
#   memory.available: 1m30s
```

Monitor actual memory usage on nodes.

```bash
# Check node memory usage
kubectl top nodes

# Output:
# NAME       CPU    MEMORY
# worker-1   45%    7800Mi/8000Mi   # 97% memory usage
# worker-2   30%    4200Mi/8000Mi   # 52% memory usage

# Check which pods are consuming memory
kubectl top pods --all-namespaces --sort-by=memory

# Identify pods exceeding requests
kubectl get pods -A -o json | \
  jq -r '.items[] | select(.status.phase == "Running") |
  "\(.metadata.namespace)/\(.metadata.name):
   Request: \(.spec.containers[0].resources.requests.memory // "none")
   Limit: \(.spec.containers[0].resources.limits.memory // "none")"'
```

## Fixing Memory Pressure Issues

Set appropriate memory requests and limits on all pods to prevent overconsumption.

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: memory-optimized-app
spec:
  replicas: 3
  selector:
    matchLabels:
      app: myapp
  template:
    metadata:
      labels:
        app: myapp
    spec:
      containers:
      - name: app
        image: myapp:v1.0
        resources:
          requests:
            memory: "256Mi"  # Guaranteed memory
            cpu: "100m"
          limits:
            memory: "512Mi"  # Maximum memory before OOMKill
            cpu: "500m"
```

The difference between requests and limits defines burstable behavior. Pods using memory above requests but below limits are first candidates for eviction during memory pressure.

Configure resource quotas at the namespace level to prevent total resource consumption from exceeding node capacity.

```yaml
apiVersion: v1
kind: ResourceQuota
metadata:
  name: compute-quota
  namespace: production
spec:
  hard:
    requests.cpu: "20"
    requests.memory: "32Gi"
    limits.cpu: "40"
    limits.memory: "64Gi"
    pods: "50"
```

## Diagnosing Disk Pressure Evictions

Disk pressure triggers when filesystem usage or inode consumption exceeds thresholds. Common causes include container logs, emptyDir volumes, and image layer accumulation.

```bash
# Check kubelet disk pressure thresholds
ssh worker-1
sudo cat /var/lib/kubelet/config.yaml | grep -A 10 eviction

# Default thresholds:
# evictionHard:
#   nodefs.available: 10%
#   nodefs.inodesFree: 5%
#   imagefs.available: 15%
```

Monitor disk usage on nodes.

```bash
# Check filesystem usage
kubectl get nodes -o json | \
  jq -r '.items[] | "\(.metadata.name):
  \(.status.capacity."ephemeral-storage") capacity,
  \(.status.allocatable."ephemeral-storage") allocatable"'

# SSH to node and check actual disk usage
ssh worker-1
df -h /var/lib/kubelet
df -h /var/lib/containerd

# Check inode usage
df -i /var/lib/kubelet
```

Identify large files and directories consuming disk space.

```bash
# Find largest directories
sudo du -h --max-depth=2 /var/lib/kubelet | sort -rh | head -20

# Check container log sizes
sudo du -sh /var/log/pods/*

# Check emptyDir volume sizes
sudo du -sh /var/lib/kubelet/pods/*/volumes/kubernetes.io~empty-dir/*
```

## Fixing Disk Pressure Issues

Configure log rotation to prevent log accumulation.

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: log-managed-app
spec:
  containers:
  - name: app
    image: myapp:v1.0
    # Send logs to stdout/stderr for container runtime management
    command: ["/app/start.sh"]
    # Logs are automatically rotated by container runtime
```

Set ephemeral storage limits on pods to prevent unbounded disk usage.

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: disk-limited-app
spec:
  containers:
  - name: app
    image: myapp:v1.0
    resources:
      requests:
        ephemeral-storage: "2Gi"
      limits:
        ephemeral-storage: "4Gi"
  - name: sidecar
    image: sidecar:latest
    volumeMounts:
    - name: cache
      mountPath: /cache
  volumes:
  - name: cache
    emptyDir:
      sizeLimit: "1Gi"  # Limit emptyDir size
```

Implement a DaemonSet to clean up disk space regularly.

```yaml
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: disk-cleanup
  namespace: kube-system
spec:
  selector:
    matchLabels:
      app: disk-cleanup
  template:
    metadata:
      labels:
        app: disk-cleanup
    spec:
      containers:
      - name: cleanup
        image: alpine:latest
        command:
        - /bin/sh
        - -c
        - |
          while true; do
            # Clean old container images
            crictl rmi --prune

            # Remove unused volumes (be careful with this)
            find /var/lib/kubelet/pods/*/volumes -type d -empty -delete

            # Clean old logs
            find /var/log/pods -type f -name "*.log" -mtime +7 -delete

            sleep 3600  # Run hourly
          done
        securityContext:
          privileged: true
        volumeMounts:
        - name: containerd
          mountPath: /var/lib/containerd
        - name: kubelet
          mountPath: /var/lib/kubelet
        - name: logs
          mountPath: /var/log/pods
      volumes:
      - name: containerd
        hostPath:
          path: /var/lib/containerd
      - name: kubelet
        hostPath:
          path: /var/lib/kubelet
      - name: logs
        hostPath:
          path: /var/log/pods
```

## Tuning Eviction Thresholds

Adjust kubelet eviction thresholds based on your node capacity and workload characteristics.

```yaml
# /var/lib/kubelet/config.yaml
apiVersion: kubelet.config.k8s.io/v1beta1
kind: KubeletConfiguration
evictionHard:
  memory.available: "200Mi"
  nodefs.available: "10%"
  nodefs.inodesFree: "5%"
  imagefs.available: "15%"
evictionSoft:
  memory.available: "500Mi"
  nodefs.available: "15%"
  nodefs.inodesFree: "10%"
  imagefs.available: "20%"
evictionSoftGracePeriod:
  memory.available: "2m"
  nodefs.available: "2m"
  nodefs.inodesFree: "2m"
  imagefs.available: "2m"
evictionMaxPodGracePeriod: 90
```

The soft thresholds with grace periods give pods time to shut down gracefully before forced termination. Hard thresholds trigger immediate eviction without grace periods.

Restart kubelet after configuration changes.

```bash
sudo systemctl restart kubelet
```

## Implementing Pod Priority and Preemption

Use priority classes to control which pods get evicted first during resource pressure.

```yaml
apiVersion: scheduling.k8s.io/v1
kind: PriorityClass
metadata:
  name: high-priority
value: 1000
globalDefault: false
description: "High priority for critical services"
---
apiVersion: scheduling.k8s.io/v1
kind: PriorityClass
metadata:
  name: low-priority
value: 100
globalDefault: false
description: "Low priority for batch jobs"
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: critical-api
spec:
  template:
    spec:
      priorityClassName: high-priority
      containers:
      - name: api
        image: api:v1.0
---
apiVersion: batch/v1
kind: Job
metadata:
  name: batch-processing
spec:
  template:
    spec:
      priorityClassName: low-priority
      containers:
      - name: processor
        image: batch:v1.0
```

During eviction, low-priority pods are terminated before high-priority ones, protecting critical services.

## Monitoring and Alerting for Resource Pressure

Set up alerts to catch resource pressure before evictions occur.

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: prometheus-alerts
  namespace: monitoring
data:
  alerts.yaml: |
    groups:
    - name: node_resources
      rules:
      - alert: NodeMemoryPressure
        expr: |
          kube_node_status_condition{condition="MemoryPressure",status="true"} == 1
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "Node {{ $labels.node }} under memory pressure"

      - alert: NodeDiskPressure
        expr: |
          kube_node_status_condition{condition="DiskPressure",status="true"} == 1
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "Node {{ $labels.node }} under disk pressure"

      - alert: HighMemoryUsage
        expr: |
          (1 - node_memory_MemAvailable_bytes / node_memory_MemTotal_bytes) > 0.85
        for: 10m
        labels:
          severity: warning
        annotations:
          summary: "Node {{ $labels.instance }} memory usage above 85%"
```

Pod evictions from resource pressure disrupt applications but protect node stability. By implementing proper resource requests and limits, tuning eviction thresholds appropriately, and monitoring resource usage proactively, you minimize unexpected evictions while maintaining cluster health. Combined with pod priorities and automated cleanup, these practices create resilient Kubernetes environments that handle resource constraints gracefully.
