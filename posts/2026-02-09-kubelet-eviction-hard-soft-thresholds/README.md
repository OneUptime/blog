# How to Tune kubelet evictionHard and evictionSoft Thresholds

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, kubelet, Resource Management

Description: Learn how to configure kubelet evictionHard and evictionSoft thresholds to prevent node resource exhaustion, understanding the differences between hard and soft eviction, and setting appropriate values for production clusters.

---

The kubelet actively monitors node resources and evicts pods when resource pressure occurs. It uses two types of thresholds: hard thresholds that trigger immediate eviction and soft thresholds that allow grace periods before eviction. Properly tuning these thresholds prevents node failures while minimizing unnecessary pod disruptions.

This guide explains how eviction thresholds work and how to configure them for different cluster scenarios.

## Understanding Eviction Signals

The kubelet monitors these resources for eviction decisions:

- **memory.available**: Available memory on the node
- **nodefs.available**: Available disk space on node root filesystem
- **nodefs.inodesFree**: Available inodes on node root filesystem
- **imagefs.available**: Available disk space on image filesystem (if separate)
- **imagefs.inodesFree**: Available inodes on image filesystem
- **pid.available**: Available process IDs

Each signal can have both hard and soft thresholds.

## Difference Between Hard and Soft Eviction

**Hard eviction:**
- Triggers immediate pod termination when threshold crossed
- No grace period honored
- Used for critical resource shortages
- Prevents node failure

**Soft eviction:**
- Requires threshold violation for configured grace period
- Honors pod termination grace periods
- Used for gradual resource degradation
- Allows time for pods to shut down gracefully

## Viewing Current Eviction Configuration

Check kubelet configuration:

```bash
# View kubelet config file
cat /var/lib/kubelet/config.yaml

# Check kubelet command-line args
ps aux | grep kubelet

# View node conditions
kubectl describe node <node-name> | grep -A 10 "Conditions:"
```

## Configuring Hard Eviction Thresholds

Create kubelet configuration with hard thresholds:

```yaml
# /var/lib/kubelet/config.yaml
apiVersion: kubelet.config.k8s.io/v1beta1
kind: KubeletConfiguration
evictionHard:
  memory.available: "500Mi"
  nodefs.available: "10%"
  nodefs.inodesFree: "5%"
  imagefs.available: "15%"
  pid.available: "5%"
```

These thresholds trigger immediate eviction:
- When available memory drops below 500Mi
- When node filesystem drops below 10% free
- When inodes drop below 5% free
- When image filesystem drops below 15% free
- When available PIDs drop below 5%

Apply configuration:

```bash
# Copy configuration
sudo cp kubelet-config.yaml /var/lib/kubelet/config.yaml

# Restart kubelet
sudo systemctl restart kubelet

# Verify configuration loaded
sudo systemctl status kubelet
journalctl -u kubelet -n 50 | grep eviction
```

## Configuring Soft Eviction Thresholds

Add soft eviction with grace periods:

```yaml
# /var/lib/kubelet/config.yaml
apiVersion: kubelet.config.k8s.io/v1beta1
kind: KubeletConfiguration
evictionHard:
  memory.available: "500Mi"
  nodefs.available: "10%"
  nodefs.inodesFree: "5%"
evictionSoft:
  memory.available: "1.5Gi"
  nodefs.available: "15%"
  nodefs.inodesFree: "10%"
evictionSoftGracePeriod:
  memory.available: "2m"
  nodefs.available: "5m"
  nodefs.inodesFree: "5m"
evictionMaxPodGracePeriod: 120
```

Soft eviction logic:
1. When memory.available drops below 1.5Gi, start grace period timer
2. If still below threshold after 2 minutes, begin evicting pods
3. Each pod gets up to 120 seconds to terminate gracefully

## Setting Eviction Pressure Transition Period

Configure how long eviction pressure must be relieved before condition clears:

```yaml
evictionPressureTransitionPeriod: 5m
```

This prevents flapping:
- Node enters MemoryPressure when threshold crossed
- Kubelet stops scheduling new pods to node
- Even after eviction frees resources, MemoryPressure persists for 5 minutes
- Prevents rapid scheduling/eviction cycles

## Calculating Appropriate Threshold Values

Use this formula for memory thresholds:

```
Hard threshold = max(500Mi, node_memory * 0.02)
Soft threshold = max(1.5Gi, node_memory * 0.05)
```

Examples:

**8GB node:**
```yaml
evictionHard:
  memory.available: "500Mi"  # 2% of 8GB = 160Mi, use minimum 500Mi
evictionSoft:
  memory.available: "1.5Gi"  # 5% of 8GB = 400Mi, use minimum 1.5Gi
```

**32GB node:**
```yaml
evictionHard:
  memory.available: "640Mi"  # 2% of 32GB
evictionSoft:
  memory.available: "1600Mi" # 5% of 32GB
```

**128GB node:**
```yaml
evictionHard:
  memory.available: "2560Mi" # 2% of 128GB
evictionSoft:
  memory.available: "6400Mi" # 5% of 128GB
```

## Configuring Node-Specific Thresholds

For heterogeneous clusters, use node labels and separate configurations:

```bash
# Label nodes by size
kubectl label nodes node-small size=small
kubectl label nodes node-large size=large
```

Deploy kubelet config via DaemonSet with node selectors:

```yaml
# small-node-kubelet-config.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: kubelet-config-small
  namespace: kube-system
data:
  kubelet-config.yaml: |
    apiVersion: kubelet.config.k8s.io/v1beta1
    kind: KubeletConfiguration
    evictionHard:
      memory.available: "500Mi"
      nodefs.available: "10%"
    evictionSoft:
      memory.available: "1Gi"
      nodefs.available: "15%"
    evictionSoftGracePeriod:
      memory.available: "1m"
      nodefs.available: "2m"
```

## Monitoring Eviction Events

Track eviction events:

```bash
# View recent evictions
kubectl get events --all-namespaces --field-selector reason=Evicted

# Watch for evictions in real-time
kubectl get events --all-namespaces --watch | grep Evicted

# Check node conditions
kubectl get nodes -o custom-columns=NAME:.metadata.name,MEMORY:.status.conditions[?\(@.type==\'MemoryPressure\'\)].status,DISK:.status.conditions[?\(@.type==\'DiskPressure\'\)].status
```

Query eviction metrics in Prometheus:

```promql
# Eviction rate
rate(kubelet_evictions_total[5m])

# Nodes under pressure
kube_node_status_condition{condition="MemoryPressure",status="true"}
kube_node_status_condition{condition="DiskPressure",status="true"}

# Available memory per node
node_memory_MemAvailable_bytes
```

## Setting Up Eviction Alerts

Create alerts for eviction activity:

```yaml
# eviction-alerts.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: prometheus-eviction-alerts
data:
  alerts.yml: |
    groups:
    - name: eviction_alerts
      rules:
      - alert: HighPodEvictionRate
        expr: rate(kubelet_evictions_total[5m]) > 1
        for: 10m
        labels:
          severity: warning
        annotations:
          summary: "High pod eviction rate"
          description: "Node {{ $labels.node }} evicting pods at {{ $value }} per second"

      - alert: NodeMemoryPressure
        expr: kube_node_status_condition{condition="MemoryPressure",status="true"} == 1
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "Node under memory pressure"
          description: "Node {{ $labels.node }} has MemoryPressure condition"

      - alert: NodeDiskPressure
        expr: kube_node_status_condition{condition="DiskPressure",status="true"} == 1
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "Node under disk pressure"
          description: "Node {{ $labels.node }} has DiskPressure condition"
```

## Understanding Pod Eviction Order

When eviction occurs, kubelet selects pods in this order:

1. **BestEffort pods**: No resource requests or limits
2. **Burstable pods**: Requests < limits, sorted by usage above requests
3. **Guaranteed pods**: Requests == limits, evicted last

Within each QoS class, higher priority pods evict last.

Example eviction scenario:

```yaml
# First to evict (BestEffort)
apiVersion: v1
kind: Pod
metadata:
  name: besteffort-pod
spec:
  containers:
  - name: app
    image: nginx
    # No resources specified

---
# Second to evict (Burstable)
apiVersion: v1
kind: Pod
metadata:
  name: burstable-pod
spec:
  containers:
  - name: app
    image: nginx
    resources:
      requests:
        memory: "256Mi"
      limits:
        memory: "512Mi"

---
# Last to evict (Guaranteed)
apiVersion: v1
kind: Pod
metadata:
  name: guaranteed-pod
spec:
  containers:
  - name: app
    image: nginx
    resources:
      requests:
        memory: "512Mi"
      limits:
        memory: "512Mi"
```

## Testing Eviction Configuration

Simulate memory pressure:

```yaml
# memory-stress-pod.yaml
apiVersion: v1
kind: Pod
metadata:
  name: memory-stress
spec:
  containers:
  - name: stress
    image: polinux/stress
    resources:
      requests:
        memory: "100Mi"
      limits:
        memory: "8Gi"
    command: ["stress"]
    args:
    - "--vm"
    - "1"
    - "--vm-bytes"
    - "7G"
    - "--vm-hang"
    - "0"
```

Monitor eviction:

```bash
# Deploy stress pod
kubectl apply -f memory-stress-pod.yaml

# Watch node conditions
watch kubectl describe node <node-name> | grep -A 5 "Conditions:"

# Check if eviction occurs
kubectl get events --watch | grep Evicted
```

## Combining with Resource Reservations

Eviction thresholds work with system and kube reservations:

```yaml
# /var/lib/kubelet/config.yaml
apiVersion: kubelet.config.k8s.io/v1beta1
kind: KubeletConfiguration
# Reserve resources for system processes
systemReserved:
  memory: "1Gi"
  cpu: "500m"
# Reserve resources for Kubernetes components
kubeReserved:
  memory: "1Gi"
  cpu: "500m"
# Eviction thresholds
evictionHard:
  memory.available: "500Mi"
evictionSoft:
  memory.available: "1.5Gi"
evictionSoftGracePeriod:
  memory.available: "2m"
# Enforce reservations
enforceNodeAllocatable:
- pods
- system-reserved
- kube-reserved
```

Total reserved memory = systemReserved + kubeReserved + evictionHard = 2.5Gi
Allocatable to pods = Node capacity - 2.5Gi

Properly configured eviction thresholds protect nodes from resource exhaustion while minimizing unnecessary pod disruptions. Set hard thresholds to prevent node failure, use soft thresholds to provide graceful eviction, adjust values based on node size and workload characteristics, and monitor eviction events to tune thresholds for your specific environment.
