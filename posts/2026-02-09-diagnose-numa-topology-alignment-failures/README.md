# How to Diagnose NUMA Topology Alignment Failures in Kubernetes Pods

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, NUMA, Troubleshooting

Description: Debug and resolve NUMA topology alignment failures in Kubernetes by analyzing kubelet logs, checking resource availability per NUMA node, and understanding Topology Manager admission errors.

---

Pods failing to schedule with topology alignment errors can be frustrating. This guide walks through diagnosing why pods fail NUMA alignment and how to fix the underlying issues.

## Common Alignment Failure Symptoms

You'll see these symptoms when topology alignment fails:

- Pods stuck in Pending state
- Events showing "Topology Affinity Error"
- Kubelet logs mentioning NUMA node exhaustion
- Pods scheduling on wrong nodes

The root cause is usually resource constraints or configuration issues.

## Checking Pod Events

Start by checking pod events:

```bash
kubectl describe pod my-app
```

Look for events like:

```
Events:
  Type     Reason            Message
  ----     ------            -------
  Warning  FailedScheduling  0/3 nodes are available: 3 Topology Affinity Error
```

This tells you the pod can't find a node with aligned resources.

## Analyzing Kubelet Logs

Kubelet logs contain detailed alignment decisions:

```bash
journalctl -u kubelet -n 1000 | grep -i "topology"
```

Look for messages like:

```
Topology Affinity Error: cannot align resources to a single NUMA node
Admit: Resources cannot fit in available NUMA nodes
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

```
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

Calculate allocatable resources by subtracting reserved amounts:

```bash
# Get kubelet config
kubectl get --raw /api/v1/nodes/worker-1/proxy/configz | jq '.kubeletconfig.systemReserved'
```

If you reserved 4GB system memory on a 32GB NUMA node, allocatable is 28GB per node.

## Diagnosing CPU Exhaustion

Check allocated CPUs per node:

```bash
kubectl describe node worker-1 | grep -A 10 "Allocated resources"
```

You'll see total allocated CPUs, but not per-NUMA distribution. Check running pods:

```bash
# List all Guaranteed pods on the node
kubectl get pods --all-namespaces -o json --field-selector spec.nodeName=worker-1 | \
  jq '.items[] | select(.status.qosClass=="Guaranteed") | {name: .metadata.name, cpu: .spec.containers[].resources.requests.cpu}'
```

Add up CPU requests. If 6 CPUs are allocated and your NUMA node has 8 CPUs, only 2 remain for new pods.

## Diagnosing Memory Exhaustion

Similarly, check memory allocation:

```bash
kubectl describe node worker-1 | grep -A 10 "Allocated resources"
```

Compare against per-NUMA capacity from `numactl --hardware`.

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

You'll see hints from CPU Manager, Memory Manager, and Device Manager, plus the final admission decision.

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

**Solution**: Reduce resource requests or disable Topology Manager for this pod.

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

Pods schedule even if alignment isn't perfect.

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

Once a pod schedules, verify alignment:

```bash
# Get pod's container ID
CONTAINER_ID=$(crictl ps | grep my-app | awk '{print $1}')

# Check CPU NUMA node
cat /sys/fs/cgroup/cpuset/kubepods/pod*/*/cpuset.cpus
# Output: 0-7 (NUMA node 0)

# Check memory NUMA node
cat /sys/fs/cgroup/cpuset/kubepods/pod*/*/cpuset.mems
# Output: 0 (NUMA node 0)
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

If this small pod fails, you have a configuration issue, not a capacity issue.

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
# Count pending pods with topology errors
kubectl get pods --all-namespaces -o json | \
  jq '[.items[] | select(.status.phase=="Pending") | select(.status.conditions[].reason=="TopologyAffinityError")] | length'
```

Export to Prometheus for alerting.

## Real-World Debugging Example

A pod requesting 6 CPUs, 24GB memory, and 1 GPU fails to schedule. Investigation:

```bash
# Check node NUMA layout
ssh worker-1 numactl --hardware
# Shows 2 NUMA nodes, 8 CPUs and 32GB each

# Check GPU placement
ssh worker-1 nvidia-smi topo -m
# GPU 0 on NUMA 0, GPU 1 on NUMA 1

# Check current allocations
kubectl describe node worker-1 | grep -A 10 "Allocated"
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
