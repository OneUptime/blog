# How to Use Topology Manager to Align CPU, Memory, and Device Allocations

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, NUMA, Topology Manager

Description: Configure Kubernetes Topology Manager to coordinate CPU, memory, and device allocations on the same NUMA node, eliminating cross-NUMA traffic and maximizing performance for latency-sensitive workloads.

---

Topology Manager orchestrates CPU Manager, Memory Manager, and Device Manager to ensure all resources for a pod come from the same NUMA node. This eliminates cross-NUMA traffic and delivers maximum performance. This guide shows you how to configure and use Topology Manager.

## What Is Topology Manager?

Topology Manager is a kubelet component that coordinates resource allocation decisions across multiple managers:

- CPU Manager: Assigns CPU cores
- Memory Manager: Allocates memory
- Device Manager: Allocates hardware devices (GPUs, NICs)

Without Topology Manager, each manager makes independent decisions. A pod might get CPUs from NUMA node 0, memory from node 1, and a GPU from node 2. This creates cross-NUMA traffic that kills performance.

Topology Manager ensures all resources come from the same NUMA node.

## Topology Manager Policies

Topology Manager has four policies:

- **none** (default): No coordination, managers act independently
- **best-effort**: Prefer NUMA alignment, allow fallback
- **restricted**: Reject pods that can't align to preferred NUMA nodes
- **single-numa-node**: Strict alignment, all resources on one NUMA node

Choose based on your performance requirements.

## Enabling Topology Manager

Configure the kubelet with a topology policy:

```yaml
apiVersion: kubelet.config.k8s.io/v1beta1
kind: KubeletConfiguration
topologyManagerPolicy: single-numa-node
cpuManagerPolicy: static
memoryManagerPolicy: Static
```

Restart the kubelet:

```bash
systemctl stop kubelet
rm /var/lib/kubelet/cpu_manager_state
rm /var/lib/kubelet/memory_manager_state
systemctl start kubelet
```

Removing state files ensures clean initialization.

## single-numa-node Policy

The strictest policy. All resources must come from one NUMA node or the pod is rejected:

```yaml
apiVersion: kubelet.config.k8s.io/v1beta1
kind: KubeletConfiguration
topologyManagerPolicy: single-numa-node
```

Use this for:

- High-performance computing
- Real-time workloads
- DPDK applications
- GPU training with tight CPU-GPU coupling

## restricted Policy

Less strict than `single-numa-node`. Allows allocation from preferred NUMA nodes, rejects if not possible:

```yaml
apiVersion: kubelet.config.k8s.io/v1beta1
kind: KubeletConfiguration
topologyManagerPolicy: restricted
```

This provides good performance while allowing more scheduling flexibility.

## best-effort Policy

Tries to align resources but allows fallback if alignment isn't possible:

```yaml
apiVersion: kubelet.config.k8s.io/v1beta1
kind: KubeletConfiguration
topologyManagerPolicy: best-effort
```

Use this when you want NUMA awareness but can't guarantee all pods will fit on single nodes.

## Creating Topology-Aligned Pods

Only Guaranteed pods with whole CPU requests get topology alignment:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: aligned-app
spec:
  containers:
  - name: app
    image: high-performance:latest
    resources:
      requests:
        cpu: "4"
        memory: "16Gi"
      limits:
        cpu: "4"
        memory: "16Gi"
```

Topology Manager coordinates with CPU and Memory Managers to allocate everything from one NUMA node.

## Verifying Topology Alignment

Check CPU and memory NUMA nodes:

```bash
# Get container ID
CONTAINER_ID=$(crictl ps | grep aligned-app | awk '{print $1}')

# Check CPU NUMA node
cat /sys/fs/cgroup/cpuset/kubepods/pod*/*/cpuset.cpus

# Check memory NUMA node
cat /sys/fs/cgroup/cpuset/kubepods/pod*/*/cpuset.mems
```

Both should reference the same NUMA node (e.g., `0`).

## Topology Manager with GPUs

When pods request GPUs, Topology Manager aligns CPUs, memory, and GPUs:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: gpu-training
spec:
  containers:
  - name: pytorch
    image: pytorch/pytorch:latest
    resources:
      requests:
        cpu: "8"
        memory: "32Gi"
        nvidia.com/gpu: "1"
      limits:
        cpu: "8"
        memory: "32Gi"
        nvidia.com/gpu: "1"
```

Topology Manager ensures the GPU is on the same NUMA node as CPUs and memory. This is critical for GPU-CPU data transfers.

## Topology Manager Scope

By default, Topology Manager considers alignment per container. For multi-container pods, set the scope to pod level:

```yaml
apiVersion: kubelet.config.k8s.io/v1beta1
kind: KubeletConfiguration
topologyManagerPolicy: single-numa-node
topologyManagerScope: pod
```

Scopes:

- **container** (default): Align each container independently
- **pod**: Align all containers in a pod to the same NUMA node

Pod scope is stricter and may reduce scheduling success but maximizes performance.

## Handling Admission Failures

With `single-numa-node` or `restricted` policies, pods can fail admission if resources can't align. Check events:

```bash
kubectl describe pod aligned-app
```

Look for events like:

```
Topology Affinity Error: Resources cannot be aligned to a single NUMA node
```

Solutions:

- Reduce resource requests to fit one NUMA node
- Switch to `best-effort` policy
- Add more nodes with larger NUMA domains
- Reserve fewer resources per node

## Reserving Resources Per NUMA Node

Reserve CPU and memory on each NUMA node for system processes:

```yaml
apiVersion: kubelet.config.k8s.io/v1beta1
kind: KubeletConfiguration
topologyManagerPolicy: single-numa-node
systemReserved:
  cpu: "2"
  memory: "4Gi"
kubeReserved:
  cpu: "1"
  memory: "2Gi"
reservedMemory:
  - numaNode: 0
    limits:
      memory: "3Gi"
  - numaNode: 1
    limits:
      memory: "3Gi"
```

This ensures each NUMA node has reserved capacity for non-pod workloads.

## Real-World Example: DPDK Network Function

DPDK applications need CPUs, memory, and network devices on the same NUMA node:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: dpdk-vnf
spec:
  containers:
  - name: vnf
    image: dpdk-vnf:latest
    securityContext:
      privileged: true
    resources:
      requests:
        cpu: "8"
        memory: "16Gi"
        hugepages-1Gi: "8Gi"
        intel.com/sriov: "2"
      limits:
        cpu: "8"
        memory: "16Gi"
        hugepages-1Gi: "8Gi"
        intel.com/sriov: "2"
    volumeMounts:
    - name: hugepages
      mountPath: /mnt/huge
  volumes:
  - name: hugepages
    emptyDir:
      medium: HugePages
```

Topology Manager ensures:

- 8 CPUs from one NUMA node
- 8GB hugepages from the same node
- 2 SR-IOV VFs from NICs on that node

This delivers maximum packet processing throughput.

## Monitoring Topology Manager

Check kubelet logs for admission decisions:

```bash
journalctl -u kubelet | grep -i "topology manager"
```

Look for messages about NUMA node selection and admission failures.

Export custom metrics with node exporter:

```bash
# Count pods by NUMA node
kubectl get pods -o json | jq '.items[] | select(.status.phase=="Running") | .metadata.name'
```

Track admission failures over time to identify sizing issues.

## Combining with Node Affinity

Use node affinity to schedule topology-aligned pods on specific nodes:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: aligned-db
spec:
  affinity:
    nodeAffinity:
      requiredDuringSchedulingIgnoredDuringExecution:
        nodeSelectorTerms:
        - matchExpressions:
          - key: numa.node.count
            operator: Gt
            values:
            - "1"
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

This ensures the pod only schedules on multi-NUMA nodes.

## Troubleshooting

**Pod Stuck Pending**: Check if requested resources exceed single NUMA node capacity:

```bash
kubectl get node worker-1 -o json | jq '.status.allocatable'
```

Compare total allocatable with per-NUMA capacity using `numactl`:

```bash
numactl --hardware
```

**Inconsistent Alignment**: Verify all managers are enabled:

```bash
kubectl get --raw /api/v1/nodes/worker-1/proxy/configz | jq '.kubeletconfig | {cpuManager, memoryManager, topologyManager}'
```

**State File Issues**: Reset all manager state files:

```bash
kubectl drain worker-1 --ignore-daemonsets
systemctl stop kubelet
rm /var/lib/kubelet/cpu_manager_state
rm /var/lib/kubelet/memory_manager_state
systemctl start kubelet
kubectl uncordon worker-1
```

## Best Practices

- Use `single-numa-node` for latency-sensitive workloads
- Enable CPU Manager, Memory Manager, and Topology Manager together
- Reserve resources on each NUMA node
- Size pods to fit within NUMA node capacity
- Use `pod` scope for multi-container workloads
- Monitor admission failures
- Document NUMA topology in node labels
- Test with synthetic workloads before production
- Consider `best-effort` for mixed workload clusters

## Performance Validation

Benchmark with and without Topology Manager to measure impact:

```bash
# Without Topology Manager
sysbench memory --threads=8 run

# With Topology Manager
sysbench memory --threads=8 run
```

Monitor NUMA stats:

```bash
numastat -p <pid>
```

Look for reduced remote memory access in the aligned case.

## Advanced: Multi-NUMA Pod Distribution

For large pods that need more resources than one NUMA node provides, disable Topology Manager for specific nodes:

```yaml
# Label nodes by NUMA configuration
kubectl label node worker-1 numa-policy=strict
kubectl label node worker-2 numa-policy=flexible
```

Use different kubelet configs per node group.

## Conclusion

Topology Manager delivers true NUMA-aware scheduling by coordinating all resource managers. Enable it with `single-numa-node` policy for maximum performance or `best-effort` for flexibility. Combine with CPU and Memory Managers, reserve resources per NUMA node, and size workloads to fit within NUMA boundaries. The scheduling constraints are worth the performance gains for latency-sensitive and high-throughput applications. Monitor admission failures, benchmark before and after, and document your NUMA strategy for the team.
