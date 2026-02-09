# How to Configure Memory Manager for NUMA-Aware Memory Allocation

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, NUMA, Memory Management

Description: Configure Kubernetes Memory Manager to allocate memory from NUMA nodes local to assigned CPUs, eliminating cross-NUMA traffic and improving performance for memory-intensive workloads.

---

Cross-NUMA memory access destroys performance for high-throughput applications. Kubernetes Memory Manager solves this by allocating memory from the same NUMA node as the pod's CPUs. This guide shows you how to enable NUMA-aware memory allocation.

## Understanding NUMA

Non-Uniform Memory Access (NUMA) is a memory architecture where each CPU has local memory with fast access and remote memory with slower access. Modern servers have multiple NUMA nodes, each with:

- CPU cores
- Local memory banks
- PCIe devices

Accessing local memory is 2-3x faster than remote memory. For performance-critical workloads, you want CPUs and memory on the same NUMA node.

## Why Memory Manager Matters

By default, Kubernetes allocates memory from any NUMA node. A pod pinned to NUMA node 0's CPUs might get memory from NUMA node 1, causing cross-NUMA traffic. Memory Manager fixes this by:

- Allocating memory from the pod's CPU NUMA node
- Setting memory affinity in the container's cgroup
- Coordinating with CPU Manager and Topology Manager

This eliminates remote memory access for guaranteed pods.

## Prerequisites

Memory Manager requires:

- Kubernetes 1.22+ (beta in 1.22, stable in 1.27)
- CPU Manager with static policy enabled
- Topology Manager enabled (recommended)
- NUMA-capable hardware

Check your node's NUMA topology:

```bash
numactl --hardware
```

You should see multiple nodes with CPUs and memory.

## Enabling Memory Manager

Configure the kubelet to enable Memory Manager:

```yaml
apiVersion: kubelet.config.k8s.io/v1beta1
kind: KubeletConfiguration
memoryManagerPolicy: Static
cpuManagerPolicy: static
topologyManagerPolicy: single-numa-node
systemReserved:
  memory: "2Gi"
kubeReserved:
  memory: "1Gi"
```

Key settings:

- `memoryManagerPolicy: Static` - Enable NUMA-aware allocation
- `cpuManagerPolicy: static` - Required for CPU pinning
- `topologyManagerPolicy: single-numa-node` - Align all resources to one NUMA node

Restart the kubelet:

```bash
systemctl stop kubelet
rm /var/lib/kubelet/memory_manager_state
systemctl start kubelet
```

## Creating NUMA-Aware Pods

Only Guaranteed pods with whole CPU requests get NUMA-aware memory. Here's an example:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: numa-aware-app
spec:
  containers:
  - name: app
    image: memory-intensive:latest
    resources:
      requests:
        cpu: "4"
        memory: "16Gi"
      limits:
        cpu: "4"
        memory: "16Gi"
```

The kubelet allocates 4 CPUs from one NUMA node and 16GB of memory from the same node.

## Verifying NUMA Memory Allocation

Check the container's memory affinity:

```bash
# Get container ID
CONTAINER_ID=$(crictl ps | grep numa-aware-app | awk '{print $1}')

# Check memory NUMA node
cat /sys/fs/cgroup/cpuset/kubepods/pod*/*/cpuset.mems
```

Output like `0` means all memory is allocated from NUMA node 0.

Compare with CPU allocation:

```bash
cat /sys/fs/cgroup/cpuset/kubepods/pod*/*/cpuset.cpus
```

Both should reference the same NUMA node.

## Memory Manager Policies

Memory Manager supports two policies:

- **None** (default): No NUMA awareness, memory allocated from any node
- **Static**: NUMA-aware allocation for Guaranteed pods

The Static policy requires hugepages support or works with regular pages when Topology Manager is enabled.

## Reserving Memory Per NUMA Node

Reserve memory on each NUMA node for system processes:

```yaml
apiVersion: kubelet.config.k8s.io/v1beta1
kind: KubeletConfiguration
memoryManagerPolicy: Static
systemReserved:
  memory: "4Gi"
reservedMemory:
  - numaNode: 0
    limits:
      memory: "2Gi"
  - numaNode: 1
    limits:
      memory: "2Gi"
```

This reserves 2GB on each NUMA node, leaving the rest allocatable.

## Working with Hugepages

Memory Manager works seamlessly with hugepages. Allocate hugepages per NUMA node:

```bash
# Allocate 512 2MB hugepages on NUMA node 0
echo 512 > /sys/devices/system/node/node0/hugepages/hugepages-2048kB/nr_hugepages

# Allocate 512 2MB hugepages on NUMA node 1
echo 512 > /sys/devices/system/node/node1/hugepages/hugepages-2048kB/nr_hugepages
```

Request hugepages in pods:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: hugepage-numa-app
spec:
  containers:
  - name: app
    image: dpdk-app:latest
    resources:
      requests:
        cpu: "4"
        memory: "8Gi"
        hugepages-2Mi: "1Gi"
      limits:
        cpu: "4"
        memory: "8Gi"
        hugepages-2Mi: "1Gi"
    volumeMounts:
    - name: hugepages
      mountPath: /dev/hugepages
  volumes:
  - name: hugepages
    emptyDir:
      medium: HugePages
```

Memory Manager ensures hugepages come from the same NUMA node as CPUs.

## Topology Manager Integration

Topology Manager coordinates CPU Manager, Memory Manager, and Device Manager. Set the policy to align all resources:

```yaml
apiVersion: kubelet.config.k8s.io/v1beta1
kind: KubeletConfiguration
cpuManagerPolicy: static
memoryManagerPolicy: Static
topologyManagerPolicy: single-numa-node
```

Policies:

- **none**: No alignment
- **best-effort**: Prefer alignment, fall back if not possible
- **restricted**: Reject pods that can't align to one NUMA node
- **single-numa-node**: Strict alignment to a single NUMA node

Use `single-numa-node` for maximum performance.

## Troubleshooting Memory Manager

**Pod Fails to Schedule**: Not enough memory on a single NUMA node. Check allocatable memory:

```bash
kubectl get node worker-1 -o json | jq '.status.allocatable'
```

**Memory Not Aligned**: Verify the pod is Guaranteed QoS and requests whole CPUs. Check kubelet logs:

```bash
journalctl -u kubelet | grep -i "memory manager"
```

**State File Corruption**: Drain the node and reset state:

```bash
kubectl drain worker-1 --ignore-daemonsets
systemctl stop kubelet
rm /var/lib/kubelet/memory_manager_state
systemctl start kubelet
kubectl uncordon worker-1
```

## Monitoring NUMA Performance

Use `numastat` to monitor cross-NUMA traffic:

```bash
numastat -c <pid>
```

Look for low values in the remote columns. High remote access indicates NUMA misalignment.

Export node exporter NUMA metrics:

```yaml
# Prometheus query
node_memory_numa_local_node_total
node_memory_numa_other_node_total
```

Low `numa_other_node` values indicate good alignment.

## Best Practices

- Enable Topology Manager with `single-numa-node` policy
- Reserve memory on each NUMA node for system processes
- Use whole CPU requests for critical workloads
- Monitor NUMA traffic with numastat
- Size pods to fit within a single NUMA node
- Document NUMA topology in runbooks
- Use node labels to schedule NUMA-aware workloads
- Test with memory-intensive benchmarks

## Real-World Example: Redis with NUMA Awareness

Redis benefits from NUMA-aware allocation to reduce memory latency:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: redis-numa
spec:
  containers:
  - name: redis
    image: redis:7
    command:
    - redis-server
    - --maxmemory
    - "14gb"
    - --maxmemory-policy
    - allkeys-lru
    resources:
      requests:
        cpu: "4"
        memory: "16Gi"
      limits:
        cpu: "4"
        memory: "16Gi"
```

All Redis memory operations stay within one NUMA node, improving throughput and reducing latency.

## DPDK and NUMA

Data Plane Development Kit (DPDK) applications require strict NUMA alignment. Combine Memory Manager with hugepages:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: dpdk-app
spec:
  containers:
  - name: dpdk
    image: dpdk-app:latest
    securityContext:
      privileged: true
    resources:
      requests:
        cpu: "8"
        memory: "32Gi"
        hugepages-1Gi: "16Gi"
      limits:
        cpu: "8"
        memory: "32Gi"
        hugepages-1Gi: "16Gi"
    volumeMounts:
    - name: hugepages
      mountPath: /mnt/huge
  volumes:
  - name: hugepages
    emptyDir:
      medium: HugePages
```

Memory Manager ensures CPUs, hugepages, and network devices are all on the same NUMA node.

## Limitations

- Only works for Guaranteed pods with whole CPU requests
- Requires NUMA-capable hardware
- Can reduce memory utilization if NUMA nodes are unbalanced
- State file must be removed when changing policies
- Not compatible with memory overcommitment

## Advanced Topology Scenarios

On a 4-socket server with 4 NUMA nodes, you might dedicate specific nodes to specific workload types:

- NUMA 0: System and Kubernetes components
- NUMA 1: Database workloads
- NUMA 2: Network-intensive apps
- NUMA 3: Compute workloads

Use node labels and taints to control placement:

```bash
kubectl label node worker-1 numa-zone=database
kubectl taint node worker-1 numa-zone=database:NoSchedule
```

Then schedule workloads with affinity:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: db-numa-1
spec:
  tolerations:
  - key: numa-zone
    value: database
    effect: NoSchedule
  nodeSelector:
    numa-zone: database
  containers:
  - name: postgres
    image: postgres:15
    resources:
      requests:
        cpu: "8"
        memory: "32Gi"
      limits:
        cpu: "8"
        memory: "32Gi"
```

## Conclusion

Memory Manager eliminates cross-NUMA traffic for guaranteed pods, delivering consistent low-latency memory access. Enable it alongside CPU Manager and Topology Manager for complete resource alignment. Reserve memory per NUMA node, size pods to fit within single nodes, and monitor NUMA metrics to verify effectiveness. While it reduces scheduling flexibility, the performance gains for memory-intensive workloads make NUMA awareness essential for high-performance Kubernetes deployments.
