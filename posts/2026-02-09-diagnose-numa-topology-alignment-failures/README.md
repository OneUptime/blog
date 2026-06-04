# How to Diagnose NUMA Topology Alignment Failures in Kubernetes Pods

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, NUMA, Troubleshooting

Description: Debug and resolve NUMA topology alignment failures in Kubernetes by analyzing kubelet logs, checking resource availability per NUMA node, and understanding Topology Manager admission errors.

---

Pods failing to run with topology alignment errors can be frustrating. This guide walks through diagnosing why pods fail NUMA alignment and how to fix the underlying issues.

## Common Alignment Failure Symptoms

You'll see these symptoms when topology alignment fails:

- Pods in `TopologyAffinityError` status
- Events showing `TopologyAffinityError`
- Kubelet logs mentioning NUMA node exhaustion
- Pods bound to nodes that the kubelet then rejects

The root cause is usually resource constraints or configuration issues.

## Checking Pod Events

Start by checking pod events:

```bash
kubectl describe pod my-app
```

Look for events like:

```text
Events:
  Type     Reason            Message
  ----     ------            -------
  Warning  TopologyAffinityError  Resources cannot be allocated with Topology locality
```

This tells you the kubelet on the selected node rejected the pod because it could not satisfy the topology policy.

## Analyzing Kubelet Logs

Kubelet logs contain detailed alignment decisions:

```bash
journalctl -u kubelet -n 1000 | grep -i "topology"
```

Look for messages like:

```text
TopologyAffinityError: Resources cannot be allocated with Topology locality
Topology Manager: best Hint NUMANodeAffinity does not satisfy policy
```

These indicate the specific failure reason.

## Checking NUMA Node Capacity

Check total node capacity:

```bash
kubectl get node worker-1 -o json | jq '.status.allocatable'
```

But this doesn't show per-NUMA capacity. SSH to the node and check:

```bash
numactl --hardware
```

Example output:

```text
available: 2 nodes (0-1)
node 0 cpus: 0 1 2 3 4 5 6 7
node 0 size: 32768 MB
node 0 free: 24576 MB
node 1 cpus: 8 9 10 11 12 13 14 15
node 1 size: 32768 MB
node 1 free: 16384 MB
```

Your pod might need 40GB memory, but no single NUMA node has that much.

## Checking Allocatable Resources Per NUMA Node

Check the kubelet's node-level reservations and Memory Manager per-NUMA reservations:

```bash
# Get kubelet config

kubectl get --raw /api/v1/nodes/worker-1/proxy/configz | \
  jq '.kubeletconfig | {systemReserved, kubeReserved, reservedMemory}'
```

`systemReserved` and `kubeReserved` are node-level reservations. If Memory Manager is enabled, use `reservedMemory` to see how that reserved memory is split across NUMA nodes. If `reservedMemory` reserves 4Gi on NUMA 0 of a 32Gi NUMA node, Memory Manager treats that NUMA node as having 28Gi available for pods.

## Diagnosing CPU Exhaustion

Check allocated CPUs per node:

```bash
kubectl describe node worker-1 | grep -A 10 "Allocated resources"
```

You'll see total allocated CPUs, but not per-NUMA distribution. Check running pods:

```bash
# List Guaranteed pods with CPU requests on the node
kubectl get pods --all-namespaces -o json --field-selector spec.nodeName=worker-1 | \
  jq '.items[] | select(.status.qosClass=="Guaranteed") | {name: .metadata.name, cpu: .spec.containers[].resources.requests.cpu}'
```

This identifies pods that may receive exclusive CPUs when CPU Manager uses the `static` policy and the CPU requests are whole numbers.

For the exact exclusive CPU assignments made by CPU Manager, check the kubelet state file on the node:

```bash
cat /var/lib/kubelet/cpu_manager_state
```

If the state file shows that 6 CPUs from an 8-CPU NUMA node are assigned, only 2 remain from that NUMA node for new exclusive CPU assignments.

## Diagnosing Memory Exhaustion

Similarly, check memory allocation:

```bash
kubectl describe node worker-1 | grep -A 10 "Allocated resources"
```

Compare against per-NUMA capacity from `numactl --hardware`.

When Memory Manager is enabled, its state file shows memory assignments and free memory by NUMA node:

```bash
cat /var/lib/kubelet/memory_manager_state
```

## Understanding Topology Manager Hints

Topology Manager collects hints from each manager and finds the best NUMA node. Enable debug logging:

```yaml
apiVersion: kubelet.config.k8s.io/v1beta1
kind: KubeletConfiguration
topologyManagerPolicy: single-numa-node
logging:
  verbosity: 4
```

Restart kubelet and check logs:

```bash
journalctl -u kubelet -f | grep -i "topology hint"
```

You'll see hints from enabled hint providers such as CPU Manager, Memory Manager, and Device Manager, plus the final admission decision.

## Common Failure Scenarios

### Scenario 1: Pod Too Large

Pod requests more resources than fit on one NUMA node:

```yaml
resources:
  requests:
    cpu: "12"
    memory: "40Gi"
```

But each NUMA node has only 8 CPUs and 32GB memory.

**Solution**: Reduce resource requests or run the workload on nodes with a less strict Topology Manager policy.

### Scenario 2: Fragmentation

NUMA nodes have capacity but not enough contiguous:

- NUMA 0: 4 CPUs free, 20GB free
- NUMA 1: 6 CPUs free, 15GB free

Pod requests 5 CPUs and 18GB. Neither node satisfies both.

**Solution**: Drain and rebalance workloads, or use `best-effort` policy.

### Scenario 3: GPU Not on NUMA Node

Pod requests GPU, but the GPU is on a different NUMA node than available CPUs/memory:

```yaml
resources:
  requests:
    cpu: "4"
    memory: "16Gi"
    nvidia.com/gpu: "1"
```

GPU 0 is on NUMA node 0, but node 0 is out of CPU capacity.

**Solution**: Ensure GPU placement across NUMA nodes or add more capacity.

## Checking Device Topology

Check which NUMA node each GPU is on:

```bash
# For NVIDIA GPUs
nvidia-smi topo -m
```

Example output shows GPU-to-CPU affinity. If GPU 0 is on NUMA node 0 but CPUs are only available on node 1, alignment fails.

## Fixing Alignment Failures

### Solution 1: Reduce Resource Requests

Make pods smaller to fit one NUMA node:

```yaml
# Before
resources:
  requests:
    cpu: "12"
    memory: "40Gi"

# After
resources:
  requests:
    cpu: "8"
    memory: "28Gi"
```

### Solution 2: Switch to best-effort Policy

Allow fallback when strict alignment isn't possible:

```yaml
apiVersion: kubelet.config.k8s.io/v1beta1
kind: KubeletConfiguration
topologyManagerPolicy: best-effort
```

Pods are admitted even if alignment isn't perfect.

### Solution 3: Add More Nodes

Expand your cluster with larger NUMA nodes or more capacity:

```bash
# Add node with 16 CPUs per NUMA node
kubectl label node new-worker-1 numa.capacity=large
```

### Solution 4: Drain and Rebalance

Drain nodes to defragment NUMA allocations:

```bash
kubectl drain worker-1 --ignore-daemonsets --delete-emptydir-data
```

Pods reschedule, potentially fitting better on NUMA nodes. Uncordon when ready:

```bash
kubectl uncordon worker-1
```

## Debugging with Strace

Watch kubelet syscalls to see cgroup updates:

```bash
strace -p $(pgrep kubelet) -e write -s 256 2>&1 | grep cpuset
```

You'll see writes to `cpuset.cpus` and `cpuset.mems` showing NUMA assignments.

## Validating Alignment After Scheduling

Once a pod is admitted and running, verify alignment:

```bash
# Get pod UID
POD_UID=$(kubectl get pod my-app -o jsonpath='{.metadata.uid}')
POD_UID_UNDERSCORE=${POD_UID//-/_}

# Check CPU and memory NUMA placement in the matching pod/container cgroups.
# On cgroup v2, use the *.effective files if cpuset.cpus or cpuset.mems is empty.
sudo find /sys/fs/cgroup -type f \
  \( -path "*${POD_UID}*" -o -path "*${POD_UID_UNDERSCORE}*" \) \
  \( -name cpuset.cpus -o -name cpuset.cpus.effective -o -name cpuset.mems -o -name cpuset.mems.effective \) \
  -print -exec cat {} \;
```

Both should match.

## Creating a Diagnostic Pod

Deploy a diagnostic pod to test alignment:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: numa-test
spec:
  containers:
  - name: test
    image: busybox
    command: ["sleep", "3600"]
    resources:
      requests:
        cpu: "2"
        memory: "4Gi"
      limits:
        cpu: "2"
        memory: "4Gi"
```

If this small pod fails on an otherwise idle node, you likely have a configuration issue, not a capacity issue.

## Checking Topology Manager State

Topology Manager doesn't have a state file, but you can infer state from other managers:

```bash
# Check CPU Manager state
cat /var/lib/kubelet/cpu_manager_state

# Check Memory Manager state
cat /var/lib/kubelet/memory_manager_state
```

These show current allocations per NUMA node.

## Best Practices for Avoiding Failures

- Size pods to fit within single NUMA nodes
- Reserve resources on each NUMA node
- Monitor NUMA capacity per node
- Use `best-effort` for non-critical workloads
- Label nodes by NUMA capacity
- Document NUMA topology in runbooks
- Test alignment with small pods first
- Set up alerts for admission failures

## Monitoring Alignment Success Rate

Track admission failures with a metric:

```bash
# Count pods with topology errors
kubectl get pods --all-namespaces -o json | \
  jq '[.items[] | select(.status.reason=="TopologyAffinityError")] | length'
```

Export to Prometheus for alerting.

## Real-World Debugging Example

A pod requesting 6 CPUs, 24GB memory, and 1 GPU fails to run. Investigation:

```bash
# Check node NUMA layout
ssh worker-1 numactl --hardware
# Shows 2 NUMA nodes, 8 CPUs and 32GB each

# Check GPU placement
ssh worker-1 nvidia-smi topo -m
# GPU 0 on NUMA 0, GPU 1 on NUMA 1

# Check current per-NUMA allocations
ssh worker-1 cat /var/lib/kubelet/cpu_manager_state
ssh worker-1 cat /var/lib/kubelet/memory_manager_state
# NUMA 0: 5 CPUs allocated, 20GB allocated
# NUMA 1: 7 CPUs allocated, 28GB allocated

# Analysis
# NUMA 0: 3 CPUs free, 12GB free (has GPU 0)
# NUMA 1: 1 CPU free, 4GB free (has GPU 1)
# Pod needs 6 CPUs - neither node can satisfy
```

**Solution**: Drain node to free up NUMA 0, or split workload into 2 smaller pods.

## Conclusion

Diagnosing NUMA alignment failures requires checking per-NUMA capacity, not just node totals. Use `numactl`, kubelet logs, and device topology tools to understand constraints. Size pods to fit single NUMA nodes, use `best-effort` for flexibility, and monitor admission failures. With practice, you'll quickly identify whether issues stem from capacity, fragmentation, or configuration problems.
