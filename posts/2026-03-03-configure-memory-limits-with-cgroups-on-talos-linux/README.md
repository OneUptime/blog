# How to Configure Memory Limits with Cgroups on Talos Linux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Memory Limits, Cgroups, Kubernetes, OOM Killer, Resource Management

Description: Learn how memory limits are enforced through cgroups on Talos Linux and how to configure them to prevent OOM kills while maximizing memory utilization.

---

Memory management in Kubernetes is fundamentally different from CPU management. While CPU is a compressible resource (a container just slows down when throttled), memory is incompressible. When a container tries to use more memory than its limit allows, the Linux kernel OOM killer terminates it. On Talos Linux with cgroup v2, memory limits are enforced through a hierarchy of controls that provide both hard limits and soft boundaries.

Getting memory configuration right is critical for stability. Set limits too low, and your pods get killed unexpectedly. Set them too high, and you waste resources or risk node-level OOM events. This guide covers how memory limits work at the cgroup level and how to configure them properly on Talos Linux.

## How Memory Limits Map to Cgroups

When you set memory resources in a Kubernetes pod spec, they map to specific cgroup v2 files:

```
Kubernetes                  Cgroup v2 File          Behavior
-----------                 ---------------         --------
resources.requests.memory   memory.min              Guaranteed minimum
                            memory.low              Best-effort protection
resources.limits.memory     memory.max              Hard limit (OOM on exceed)
                            memory.high             Throttle threshold
```

Here is a concrete example:

```yaml
# Pod with 512Mi request and 1Gi limit
resources:
  requests:
    memory: "512Mi"
  limits:
    memory: "1Gi"
```

This translates to:
```
memory.min = 536870912    (512 MiB - guaranteed)
memory.high = 966367641   (approximately 90% of 1 GiB)
memory.max = 1073741824   (1 GiB - hard limit)
```

## Understanding the Memory Hierarchy

Cgroup v2 provides four levels of memory control:

**memory.min** - This is a hard guarantee. The kernel will not reclaim memory below this threshold, even under extreme memory pressure on the node. This maps to the pod's memory request.

**memory.low** - This is a soft guarantee. The kernel tries to avoid reclaiming memory below this threshold but may do so under extreme pressure. This provides a buffer above the minimum.

**memory.high** - This is a throttle point. When usage exceeds this value, the kernel starts reclaiming memory aggressively and slowing down memory allocations. The process is not killed but may become very slow.

**memory.max** - This is the hard limit. If usage hits this and cannot be reduced through reclamation, the OOM killer activates and terminates processes in the cgroup.

## Configuring Memory QoS on Talos Linux

Memory QoS leverages cgroup v2's memory.min and memory.high controls. Enable it through the kubelet:

```yaml
# talos-memory-qos.yaml
# Enable memory QoS for better memory isolation
machine:
  kubelet:
    extraConfig:
      # Memory throttling factor determines memory.high
      # memory.high = memory.max * memoryThrottlingFactor
      memoryThrottlingFactor: 0.9
      # Enable memory manager for NUMA-aware allocation
      memoryManagerPolicy: "Static"
      # Reserve memory for guaranteed allocation
      reservedMemory:
        - numaNode: 0
          limits:
            memory: "1Gi"
```

Apply the configuration:

```bash
# Apply memory QoS configuration
talosctl apply-config --nodes <node-ips> --patch @talos-memory-qos.yaml
```

## Inspecting Memory Cgroup Settings

Use a debug pod or talosctl to inspect memory cgroup values:

```bash
# View memory statistics for a specific pod's cgroup
kubectl exec cgroup-debug -n kube-system -- \
  cat /sys/fs/cgroup/kubepods.slice/kubepods-burstable.slice/kubepods-burstable-pod<uid>.slice/memory.stat

# Key fields in memory.stat:
# anon           - Anonymous memory (heap, stack, mmap)
# file           - File-backed memory (page cache)
# kernel         - Kernel memory consumed by the cgroup
# sock           - Socket buffer memory
# shmem          - Shared memory
# pgfault        - Page faults
# pgmajfault     - Major page faults (require disk IO)

# View the hard memory limit
kubectl exec cgroup-debug -n kube-system -- \
  cat /sys/fs/cgroup/kubepods.slice/kubepods-burstable.slice/kubepods-burstable-pod<uid>.slice/memory.max

# View current memory usage
kubectl exec cgroup-debug -n kube-system -- \
  cat /sys/fs/cgroup/kubepods.slice/kubepods-burstable.slice/kubepods-burstable-pod<uid>.slice/memory.current

# View memory events (OOM, high watermark hits)
kubectl exec cgroup-debug -n kube-system -- \
  cat /sys/fs/cgroup/kubepods.slice/kubepods-burstable.slice/kubepods-burstable-pod<uid>.slice/memory.events
```

## Understanding OOM Kills

When a container exceeds its memory.max, the OOM killer activates. On cgroup v2, the `memory.events` file tracks this:

```bash
# Check OOM events
cat /sys/fs/cgroup/kubepods.slice/.../memory.events

# Output:
# low 0        - Times usage crossed below memory.low
# high 12      - Times usage crossed above memory.high
# max 3        - Times usage hit memory.max
# oom 2        - Times OOM killer was invoked
# oom_kill 2   - Times processes were actually killed
# oom_group_kill 1 - Times the entire cgroup was killed
```

Monitor OOM events with Prometheus:

```yaml
# oom-alerts.yaml
# Alert on OOM kills in the cluster
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: oom-kill-alerts
  namespace: monitoring
spec:
  groups:
    - name: memory.oom
      rules:
        - alert: ContainerOOMKilled
          expr: >
            increase(kube_pod_container_status_restarts_total[5m]) > 0
            and on(namespace, pod, container)
            kube_pod_container_status_last_terminated_reason{reason="OOMKilled"} > 0
          for: 0m
          labels:
            severity: warning
          annotations:
            summary: >
              Container {{ $labels.container }} in
              {{ $labels.namespace }}/{{ $labels.pod }}
              was OOM killed

        - alert: ContainerMemoryNearLimit
          expr: >
            container_memory_working_set_bytes{container!=""}
            /
            container_spec_memory_limit_bytes{container!=""} > 0.9
          for: 5m
          labels:
            severity: warning
          annotations:
            summary: >
              Container {{ $labels.container }} is using
              {{ $value | humanizePercentage }} of its memory limit
```

## Setting Eviction Thresholds

Configure kubelet eviction to protect the node from memory exhaustion:

```yaml
# talos-eviction-config.yaml
# Memory eviction thresholds for Talos nodes
machine:
  kubelet:
    extraArgs:
      # Hard eviction - immediate pod eviction
      eviction-hard: "memory.available<500Mi,nodefs.available<10%,imagefs.available<15%"
      # Soft eviction - grace period before eviction
      eviction-soft: "memory.available<1Gi,nodefs.available<15%,imagefs.available<20%"
      # How long the soft condition must persist
      eviction-soft-grace-period: "memory.available=1m30s,nodefs.available=2m,imagefs.available=2m"
      # Minimum time between evictions
      eviction-pressure-transition-period: "30s"
      # Minimum reclaim amount
      eviction-minimum-reclaim: "memory.available=256Mi,nodefs.available=1Gi"
```

## Memory Overcommit Strategies

You have three strategies for memory allocation:

### Conservative (No Overcommit)

```yaml
# Every pod gets exactly what it requests, no more
# Requests = Limits for all pods
resources:
  requests:
    memory: "1Gi"
  limits:
    memory: "1Gi"
# This creates Guaranteed QoS pods
# Pro: Maximum stability
# Con: Lowest utilization
```

### Moderate Overcommit

```yaml
# Allow some overcommit for burst capacity
# Limits > Requests (Burstable QoS)
resources:
  requests:
    memory: "512Mi"
  limits:
    memory: "1Gi"
# Pro: Good balance of stability and utilization
# Con: OOM kills possible under pressure
```

### Aggressive Overcommit

```yaml
# Significant overcommit for maximum utilization
resources:
  requests:
    memory: "256Mi"
  limits:
    memory: "2Gi"
# Pro: Highest utilization
# Con: Higher risk of OOM kills and node pressure
```

## Configuring Swap with Cgroup v2

Cgroup v2 supports swap accounting, and recent Kubernetes versions support limited swap on nodes:

```yaml
# talos-swap-config.yaml
# Enable swap support (use with caution)
machine:
  kubelet:
    extraArgs:
      feature-gates: "NodeSwap=true"
    extraConfig:
      memorySwap:
        swapBehavior: "LimitedSwap"
```

Note: Talos Linux does not enable swap by default, and for most Kubernetes workloads, swap is not recommended. It can mask memory issues and cause unpredictable latency.

## Debugging Memory Issues

When pods are getting OOM killed or running into memory pressure:

```bash
# Check which pods are using the most memory
kubectl top pods -A --sort-by=memory | head -20

# View detailed memory breakdown for a pod
kubectl exec <pod> -- cat /proc/meminfo

# Check memory cgroup events on the node
kubectl exec cgroup-debug -n kube-system -- sh -c '
  for cg in /sys/fs/cgroup/kubepods.slice/*/kubepods-*-pod*.slice; do
    events=$(cat "$cg/memory.events" 2>/dev/null)
    oom=$(echo "$events" | grep "^oom " | awk "{print \$2}")
    if [ "$oom" -gt 0 ] 2>/dev/null; then
      echo "$(basename $cg): $oom OOM events"
    fi
  done
'

# Check node-level memory pressure
kubectl describe node <node-name> | grep -A5 "Conditions:"
```

## Recommended Memory Configuration

```yaml
# For stateless web services
# Allow moderate burst with reasonable limits
resources:
  requests:
    memory: "256Mi"
  limits:
    memory: "512Mi"

# For databases and caches
# Use Guaranteed QoS for stability
resources:
  requests:
    memory: "4Gi"
  limits:
    memory: "4Gi"

# For batch processing
# Larger spread to handle variable workloads
resources:
  requests:
    memory: "512Mi"
  limits:
    memory: "2Gi"
```

## Summary

Memory limits on Talos Linux are enforced through the cgroup v2 memory controller, which provides a layered approach with memory.min, memory.low, memory.high, and memory.max. Unlike CPU throttling, exceeding memory limits results in process termination, making proper configuration critical for stability. Enable memory QoS to take advantage of cgroup v2's soft throttling at memory.high before the hard OOM kill at memory.max. Monitor OOM events and memory utilization through Prometheus, and set appropriate eviction thresholds to protect node stability. The right balance between stability and utilization depends on your workload type - use Guaranteed QoS for stateful workloads and moderate overcommit for stateless services.
