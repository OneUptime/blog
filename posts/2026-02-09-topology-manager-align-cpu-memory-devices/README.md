# How to Use Topology Manager to Align CPU, Memory, and Device Allocations

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, NUMA, Topology Manager

Description: Configure Kubernetes Topology Manager to coordinate CPU, memory, and device allocations on the same NUMA node.

---

Topology Manager coordinates CPU Manager, Memory Manager, and Device Manager hints so requested resources can be aligned on compatible NUMA nodes. With strict policies, this can keep latency-sensitive resources on one NUMA node and reduce cross-NUMA traffic. This guide shows you how to configure and use Topology Manager.

## What Is Topology Manager?

Topology Manager is a kubelet component that coordinates resource allocation decisions across multiple managers:

- CPU Manager: Assigns CPU cores
- Memory Manager: Allocates memory
- Device Manager: Allocates hardware devices (GPUs, NICs)

Without Topology Manager, each manager makes independent decisions. A pod might get CPUs from NUMA node 0, memory from node 1, and a GPU from node 2. This creates cross-NUMA traffic that kills performance.

Topology Manager aligns the requested resources that its hint providers can describe.

## Topology Manager Policies

Topology Manager has four policies:

- **none** (default): No coordination, managers act independently
- **best-effort**: Prefer NUMA alignment, allow fallback
- **restricted**: Reject pods that can't align to preferred NUMA nodes
- **single-numa-node**: Strict alignment, hinted resources on one NUMA node

Choose based on your performance requirements.

## Enabling Topology Manager

Configure the kubelet with a topology policy:

```yaml
apiVersion: kubelet.config.k8s.io/v1beta1
kind: KubeletConfiguration
topologyManagerPolicy: single-numa-node
cpuManagerPolicy: static
memoryManagerPolicy: Static
reservedSystemCPUs: "0"
reservedMemory:
  - numaNode: 0
    limits:
      memory: "100Mi"
```

When changing manager policies on an existing node, drain it, restart the kubelet, and reset the old manager state:

```bash
kubectl drain worker-1 --ignore-daemonsets
systemctl stop kubelet
rm /var/lib/kubelet/cpu_manager_state
rm /var/lib/kubelet/memory_manager_state
systemctl start kubelet
kubectl uncordon worker-1
```

Removing state files is useful when changing manager policies or recovering from incompatible checkpoints. Do not delete them during a routine kubelet restart.

## single-numa-node Policy

The strictest policy. Resources with topology hints must fit a single NUMA node or the pod is rejected by kubelet admission:

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

Less strict than `single-numa-node`. Allows preferred alignments that may span multiple NUMA nodes, but rejects the pod if the selected hint is not preferred:

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

CPU Manager assigns exclusive CPUs only to containers in Guaranteed pods with whole CPU requests. Memory Manager's `Static` policy provides memory topology hints for Guaranteed pods:

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

With `single-numa-node`, Topology Manager coordinates with CPU and Memory Managers to admit the pod only when the hinted CPU and memory allocation can fit one NUMA node.

## Verifying Topology Alignment

Check the container's allowed CPUs and memory NUMA nodes:

```bash
# Get container ID

CONTAINER_ID=$(crictl ps --name aligned-app -q | head -n1)
PID=$(crictl inspect "$CONTAINER_ID" | jq -r '.info.pid')

# Check allowed CPU IDs and memory NUMA nodes
grep -E 'Cpus_allowed_list|Mems_allowed_list' /proc/"$PID"/status

# Map CPU IDs to NUMA nodes
lscpu -e=CPU,NODE
```

The allowed CPU IDs should map to the same NUMA node listed in `Mems_allowed_list` for a single-NUMA allocation.

## Topology Manager with GPUs

When pods request GPUs, Topology Manager can align CPUs, memory, and GPUs if the GPU device plugin reports NUMA topology information:

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

With `single-numa-node`, kubelet admits the pod only when the GPU topology hints are compatible with the CPU and memory hints. This is critical for GPU-CPU data transfers.

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

With `single-numa-node` or `restricted` policies, pods can fail kubelet admission if resources can't align. Check events:

```bash
kubectl describe pod aligned-app
```

Look for events like:

```text
Topology Affinity Error: Resources cannot be aligned to a single NUMA node
```

Solutions:

- Reduce resource requests to fit one NUMA node
- Switch to `best-effort` policy
- Add more nodes with larger NUMA domains
- Reserve fewer resources per node

## Reserving Resources Per NUMA Node

Reserve node memory per NUMA node for system and kubelet processes. With the `Static` Memory Manager policy, the total reserved memory must account for `systemReserved`, `kubeReserved`, and memory eviction thresholds:

```yaml
apiVersion: kubelet.config.k8s.io/v1beta1
kind: KubeletConfiguration
topologyManagerPolicy: single-numa-node
systemReserved:
  memory: "3Gi"
kubeReserved:
  memory: "2Gi"
reservedMemory:
  - numaNode: 0
    limits:
      memory: "3Gi"
  - numaNode: 1
    limits:
      memory: "2148Mi"
```

This keeps reserved memory out of the Memory Manager's container workload allocations.

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

With the required CPU, Memory, and device-manager topology hints, Topology Manager can ensure:

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

For cluster-level monitoring, scrape kubelet metrics and use a privileged agent to read the kubelet pod-resources API when you need per-container CPU, memory, and device topology. A basic pod list alone does not expose NUMA placement:

```bash
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

This ensures the pod only schedules on nodes that you have accurately labeled as multi-NUMA nodes.

## Troubleshooting

**Pod Fails Kubelet Admission**: Check if requested resources exceed single NUMA node capacity:

```bash
kubectl get node worker-1 -o json | jq '.status.allocatable'
```

Compare total allocatable with per-NUMA capacity using `numactl`:

```bash
numactl --hardware
```

**Inconsistent Alignment**: Verify all managers are enabled:

```bash
kubectl get --raw /api/v1/nodes/worker-1/proxy/configz | jq '.kubeletconfig | {cpuManagerPolicy, memoryManagerPolicy, topologyManagerPolicy, topologyManagerScope}'
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

Topology Manager delivers NUMA-aware kubelet admission and allocation by coordinating resource managers. Enable it with `single-numa-node` policy for maximum performance or `best-effort` for flexibility. Combine with CPU and Memory Managers, reserve resources per NUMA node, and size workloads to fit within NUMA boundaries. The admission constraints are worth the performance gains for latency-sensitive and high-throughput applications. Monitor admission failures, benchmark before and after, and document your NUMA strategy for the team.
