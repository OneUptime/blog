# How to Configure OvercommitMemory and Pod Eviction Thresholds on kubelet

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, kubelet, Resource Management

Description: Learn how to configure kubelet's overcommit memory settings and pod eviction thresholds to prevent node resource exhaustion and optimize memory allocation in your Kubernetes cluster.

---

Kubernetes nodes can run out of memory when pods collectively request more resources than are physically available. The kubelet component manages memory overcommitment and eviction thresholds to protect nodes from resource exhaustion. Understanding how to configure these settings properly ensures your cluster remains stable while maximizing resource utilization.

Memory overcommitment occurs when the sum of pod memory requests exceeds the node's allocatable memory. The kubelet uses eviction thresholds to preemptively terminate pods before the node runs out of resources completely. This article walks through configuring both overcommit behavior and eviction thresholds for production Kubernetes clusters.

## Understanding Memory Overcommitment

The kernel's vm.overcommit_memory parameter controls how Linux handles memory allocation requests. Kubernetes nodes typically use one of three modes:

- **Mode 0 (Heuristic)**: The kernel estimates available memory and refuses obvious overcommits
- **Mode 1 (Always)**: The kernel never refuses memory allocation requests
- **Mode 2 (Never)**: The kernel refuses allocations exceeding CommitLimit

Most Kubernetes distributions default to mode 0, which balances flexibility with safety. However, mode 2 provides the strictest guarantees against memory overcommitment.

## Configuring Kernel Overcommit Settings

First, check your current overcommit settings:

```bash
# View current overcommit mode
cat /proc/sys/vm/overcommit_memory

# View overcommit ratio (used in mode 2)
cat /proc/sys/vm/overcommit_ratio
```

To set strict overcommit limits on your nodes, configure mode 2 with an appropriate ratio:

```bash
# Set overcommit mode to strict (mode 2)
sudo sysctl -w vm.overcommit_memory=2

# Set overcommit ratio to 80% (default is 50%)
# This means: CommitLimit = (RAM * 0.8) + Swap
sudo sysctl -w vm.overcommit_ratio=80

# Make changes persistent
echo "vm.overcommit_memory=2" | sudo tee -a /etc/sysctl.conf
echo "vm.overcommit_ratio=80" | sudo tee -a /etc/sysctl.conf
```

For Kubernetes nodes, mode 2 with an 80% ratio provides good protection while allowing reasonable memory usage. You might need to adjust the ratio based on your workload patterns and whether you use swap.

## Configuring kubelet Eviction Thresholds

The kubelet monitors node resources and evicts pods when thresholds are exceeded. Create or edit your kubelet configuration file:

```yaml
# /var/lib/kubelet/config.yaml
apiVersion: kubelet.config.k8s.io/v1beta1
kind: KubeletConfiguration
evictionHard:
  memory.available: "500Mi"
  nodefs.available: "10%"
  nodefs.inodesFree: "5%"
  imagefs.available: "15%"
evictionSoft:
  memory.available: "1Gi"
  nodefs.available: "15%"
  nodefs.inodesFree: "10%"
  imagefs.available: "20%"
evictionSoftGracePeriod:
  memory.available: "1m30s"
  nodefs.available: "2m"
  nodefs.inodesFree: "2m"
  imagefs.available: "2m"
evictionMaxPodGracePeriod: 90
evictionPressureTransitionPeriod: 5m
```

Hard thresholds trigger immediate evictions when crossed. Soft thresholds require the condition to persist for the grace period before triggering evictions.

## Understanding Eviction Signals

The kubelet monitors several signals for eviction decisions:

- **memory.available**: Available memory on the node (MemAvailable from /proc/meminfo)
- **nodefs.available**: Available disk space on the node filesystem
- **nodefs.inodesFree**: Available inodes on the node filesystem
- **imagefs.available**: Available disk space on the image filesystem (if separate)

For memory eviction, the kubelet uses this formula:

```
memory.available = node.status.capacity[memory] - node.stats.memory.workingSet
```

This differs from free memory reported by tools like `free` because it accounts for reclaimable memory like page cache.

## Setting Up Eviction Policies with kubeadm

If you use kubeadm to bootstrap your cluster, configure eviction thresholds in the kubelet configuration passed to kubeadm:

```yaml
# kubeadm-config.yaml
apiVersion: kubeadm.k8s.io/v1beta3
kind: ClusterConfiguration
---
apiVersion: kubelet.config.k8s.io/v1beta1
kind: KubeletConfiguration
evictionHard:
  memory.available: "500Mi"
evictionSoft:
  memory.available: "1.5Gi"
evictionSoftGracePeriod:
  memory.available: "2m"
systemReserved:
  memory: "1Gi"
  cpu: "500m"
kubeReserved:
  memory: "1Gi"
  cpu: "500m"
```

Apply this configuration during cluster initialization:

```bash
kubeadm init --config kubeadm-config.yaml
```

For existing nodes, update the kubelet configuration and restart:

```bash
# Copy new configuration
sudo cp kubelet-config.yaml /var/lib/kubelet/config.yaml

# Restart kubelet
sudo systemctl restart kubelet

# Verify the configuration loaded
sudo systemctl status kubelet
journalctl -u kubelet -n 50
```

## Monitoring Eviction Events

Track eviction events to understand if your thresholds are appropriate:

```bash
# Watch for eviction events
kubectl get events --all-namespaces --watch | grep Evicted

# Check node conditions
kubectl describe node <node-name> | grep -A 10 "Conditions:"

# View detailed eviction stats
kubectl get events --all-namespaces \
  --field-selector reason=Evicted \
  --sort-by='.lastTimestamp'
```

You can also check the kubelet logs for eviction decisions:

```bash
# View recent eviction logs
sudo journalctl -u kubelet | grep -i evict | tail -20

# Follow eviction activity in real-time
sudo journalctl -u kubelet -f | grep -i evict
```

## Calculating Appropriate Thresholds

Set eviction thresholds based on your node size and workload characteristics. Here's a formula for memory.available hard threshold:

```
memory.available (hard) = max(500Mi, node_memory * 0.05)
```

For a 16GB node:
- Hard threshold: 500Mi (minimum)
- Soft threshold: 1.5Gi (allows some buffer)

For a 64GB node:
- Hard threshold: 3.2Gi (5% of 64GB)
- Soft threshold: 6.4Gi (10% of 64GB)

## Combining with Resource Reservations

Eviction thresholds work alongside system and kube reserved resources:

```yaml
# /var/lib/kubelet/config.yaml
apiVersion: kubelet.config.k8s.io/v1beta1
kind: KubeletConfiguration
systemReserved:
  memory: "2Gi"
  cpu: "1000m"
  ephemeral-storage: "10Gi"
kubeReserved:
  memory: "1Gi"
  cpu: "500m"
  ephemeral-storage: "5Gi"
evictionHard:
  memory.available: "1Gi"
enforceNodeAllocatable:
  - pods
  - system-reserved
  - kube-reserved
```

This configuration reserves 3Gi total (2Gi system + 1Gi kube) plus keeps 1Gi for eviction buffer, leaving the remaining memory allocatable to pods.

## Testing Your Configuration

Validate your eviction thresholds by creating a memory-intensive pod:

```yaml
# memory-stress.yaml
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
        memory: "2Gi"
    command: ["stress"]
    args:
    - "--vm"
    - "1"
    - "--vm-bytes"
    - "1500M"
    - "--vm-hang"
    - "0"
```

Deploy multiple instances and watch for evictions:

```bash
# Deploy stress pods
kubectl apply -f memory-stress.yaml

# Monitor memory pressure
kubectl top nodes
kubectl describe node <node-name> | grep -A 5 "Allocated resources"

# Watch for evictions
kubectl get events --watch | grep Evicted
```

## Adjusting Thresholds Based on Workload

For workloads with predictable memory patterns, you can use tighter thresholds. For bursty workloads, provide more headroom:

```yaml
# Conservative configuration for production (high stability)
evictionHard:
  memory.available: "2Gi"
evictionSoft:
  memory.available: "4Gi"
evictionSoftGracePeriod:
  memory.available: "5m"

# Aggressive configuration for dev/test (high utilization)
evictionHard:
  memory.available: "256Mi"
evictionSoft:
  memory.available: "512Mi"
evictionSoftGracePeriod:
  memory.available: "30s"
```

Proper configuration of memory overcommit settings and eviction thresholds prevents node failures while maximizing resource utilization. Monitor your cluster's eviction patterns regularly and adjust thresholds based on actual workload behavior. Start with conservative thresholds in production and tune them based on observed metrics and eviction frequency.
