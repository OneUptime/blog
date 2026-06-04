# How to Fix Kubernetes Pod Evictions Caused by Node Memory Pressure

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Resource Management, Node Management

Description: Learn how to diagnose and resolve pod evictions caused by node memory pressure and disk pressure in Kubernetes, including prevention strategies and resource management best practices.

---

Kubernetes evicts pods when nodes run out of critical resources like memory or disk space. These evictions protect node stability by terminating pods before resource exhaustion crashes system processes. However, unexpected evictions disrupt applications and can cascade into broader outages if multiple pods fail simultaneously.

Understanding kubelet eviction mechanisms and implementing proper resource management prevents these disruptions. This guide covers diagnosing eviction causes, tuning eviction thresholds, and implementing strategies that keep nodes healthy without sacrificing application availability.

## Understanding Kubelet Eviction Policies

The kubelet monitors node resource usage and triggers evictions when consumption crosses configured thresholds. Two types of thresholds exist: hard thresholds that trigger immediate evictions, and soft thresholds that allow grace periods before evicting pods.

Memory pressure occurs when available memory drops below thresholds. Disk pressure happens when available filesystem space or free inodes drop below thresholds. The kubelet tracks disk metrics for `nodefs`, `imagefs`, and, on supported configurations, `containerfs`.

When eviction triggers, kubelet selects pods based on whether usage exceeds requests, then pod priority, then usage relative to requests. Pods using less than their requests are evicted last; high-priority system pods are strongly protected, but they are not absolutely immune if the node cannot reclaim resources any other way.

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

# Default hard thresholds on Linux nodes:
# evictionHard:
#   memory.available: 100Mi
#   nodefs.available: 10%
#   nodefs.inodesFree: 5%
#   imagefs.available: 15%
#   imagefs.inodesFree: 5%
#
# evictionSoft and evictionSoftGracePeriod default to nil.
```

Monitor actual memory usage on nodes.

```bash
# Check node memory usage
kubectl top nodes

# Output:
# NAME       CPU(cores)   CPU%   MEMORY(bytes)   MEMORY%
# worker-1   450m         45%    7800Mi         97%
# worker-2   300m         30%    4200Mi         52%

# Check which pods are consuming memory
kubectl top pods --all-namespaces --sort-by=memory

# List configured memory requests and limits by container
kubectl get pods -A -o json | \
  jq -r '.items[] | select(.status.phase == "Running") as $pod |
  $pod.spec.containers[] |
  "\($pod.metadata.namespace)/\($pod.metadata.name) container=\(.name):
   Request: \(.resources.requests.memory // "none")
   Limit: \(.resources.limits.memory // "none")"'
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
            memory: "256Mi"  # Used for scheduling and eviction decisions
            cpu: "100m"
          limits:
            memory: "512Mi"  # Memory limit enforced reactively by OOM kills
            cpu: "500m"
```

Pods that have at least one request or limit but do not meet the Guaranteed QoS requirements are Burstable. Pods using memory above requests are candidates for eviction during memory pressure, with pod priority also affecting the final order.

Configure resource quotas at the namespace level to cap aggregate requests, limits, and pod counts for that namespace.

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

Disk pressure triggers when available filesystem space or free inodes fall below thresholds. Common causes include container logs, emptyDir volumes, and image layer accumulation.

```bash
# Check kubelet disk pressure thresholds
ssh worker-1
sudo cat /var/lib/kubelet/config.yaml | grep -A 10 eviction

# Default thresholds:
# evictionHard:
#   nodefs.available: 10%
#   nodefs.inodesFree: 5%
#   imagefs.available: 15%
#   imagefs.inodesFree: 5%
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

Configure kubelet container log rotation to prevent log accumulation.

```yaml
# /var/lib/kubelet/config.yaml
apiVersion: kubelet.config.k8s.io/v1beta1
kind: KubeletConfiguration
containerLogMaxSize: "10Mi"
containerLogMaxFiles: 5
```

Applications should write logs to stdout and stderr so the kubelet can manage the container log files through the CRI logging path.

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

Implement a DaemonSet only for cleanup paths you explicitly own. Do not delete kubelet-managed pod volumes or container runtime state directly.

```yaml
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: app-cache-cleanup
  namespace: kube-system
spec:
  selector:
    matchLabels:
      app: app-cache-cleanup
  template:
    metadata:
      labels:
        app: app-cache-cleanup
    spec:
      containers:
      - name: cleanup
        image: busybox:1.36
        command:
        - /bin/sh
        - -c
        - |
          while true; do
            # Clean only files owned by your workload or node bootstrap process
            find /var/cache/myapp -type f -mtime +7 -delete

            sleep 3600  # Run hourly
          done
        securityContext:
          privileged: true
        volumeMounts:
        - name: app-cache
          mountPath: /var/cache/myapp
      volumes:
      - name: app-cache
        hostPath:
          path: /var/cache/myapp
          type: DirectoryOrCreate
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
  imagefs.inodesFree: "5%"
evictionSoft:
  memory.available: "500Mi"
  nodefs.available: "15%"
  nodefs.inodesFree: "10%"
  imagefs.available: "20%"
  imagefs.inodesFree: "10%"
evictionSoftGracePeriod:
  memory.available: "2m"
  nodefs.available: "2m"
  nodefs.inodesFree: "2m"
  imagefs.available: "2m"
  imagefs.inodesFree: "2m"
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
  replicas: 3
  selector:
    matchLabels:
      app: critical-api
  template:
    metadata:
      labels:
        app: critical-api
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
      restartPolicy: OnFailure
      containers:
      - name: processor
        image: batch:v1.0
```

For pods in the same eviction category, lower-priority pods are terminated before higher-priority ones, protecting critical services.

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
