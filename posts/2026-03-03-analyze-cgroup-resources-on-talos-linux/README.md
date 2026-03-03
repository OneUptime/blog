# How to Analyze Cgroup Resources on Talos Linux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Cgroups, Resource Analysis, Kubernetes, Linux Kernel, Container Resources

Description: Learn how to inspect and analyze cgroup resource allocation and usage on Talos Linux for better understanding of container resource management.

---

Control groups, or cgroups, are the Linux kernel mechanism that Kubernetes uses to enforce resource limits on containers. Every pod running on your Talos Linux cluster has its resource allocation managed through cgroups. Understanding how cgroups work and how to analyze them gives you deep visibility into what is happening at the resource level, beyond what kubectl top or standard monitoring tools can show you.

Talos Linux uses cgroup v2 by default, which provides a unified hierarchy and improved resource management compared to the older cgroup v1. This guide covers how to inspect and analyze cgroup resources on Talos Linux nodes.

## Cgroup Basics on Talos Linux

In the cgroup v2 hierarchy, each pod gets its own cgroup under the kubelet's cgroup root. The structure looks like this:

```
/sys/fs/cgroup/
  kubepods/
    burstable/
      pod<uid>/
        <container-id>/
    guaranteed/
      pod<uid>/
        <container-id>/
    besteffort/
      pod<uid>/
        <container-id>/
  system.slice/
    kubelet.service/
    containerd.service/
```

Kubernetes assigns pods to QoS classes (Guaranteed, Burstable, BestEffort), and each class gets its own cgroup subtree with different resource guarantees.

## Accessing Cgroup Data on Talos

Since Talos Linux does not provide SSH access, you use `talosctl` to interact with the node filesystem:

```bash
# List the top-level cgroup hierarchy
talosctl read /proc/cgroups --nodes <node-ip>

# View the cgroup v2 mount
talosctl ls /sys/fs/cgroup --nodes <node-ip>

# Check the kubepods cgroup structure
talosctl ls /sys/fs/cgroup/kubepods.slice --nodes <node-ip>
```

For more detailed analysis, you can run a debug pod with host access:

```yaml
# debug-cgroup-pod.yaml
# Privileged pod for cgroup analysis (temporary use only)
apiVersion: v1
kind: Pod
metadata:
  name: cgroup-debug
  namespace: kube-system
spec:
  hostPID: true
  hostNetwork: true
  nodeSelector:
    kubernetes.io/hostname: <target-node>
  containers:
    - name: debug
      image: alpine:latest
      command: ["sleep", "3600"]
      securityContext:
        privileged: true
      volumeMounts:
        - name: cgroup
          mountPath: /sys/fs/cgroup
          readOnly: true
        - name: proc
          mountPath: /host/proc
          readOnly: true
  volumes:
    - name: cgroup
      hostPath:
        path: /sys/fs/cgroup
    - name: proc
      hostPath:
        path: /proc
  restartPolicy: Never
```

## Analyzing CPU Cgroup Resources

The CPU controller in cgroup v2 manages CPU time allocation. Key files to examine:

```bash
# Connect to the debug pod
kubectl exec -it cgroup-debug -n kube-system -- /bin/sh

# View CPU usage for all kubepods
cat /sys/fs/cgroup/kubepods.slice/cpu.stat
# Output:
# usage_usec 1234567890
# user_usec 987654321
# system_usec 246913569
# nr_periods 100000
# nr_throttled 1234
# throttled_usec 5678900

# Check CPU weight (relative priority) for a specific pod
# Find the pod cgroup first
ls /sys/fs/cgroup/kubepods.slice/kubepods-burstable.slice/

# Read the CPU weight
cat /sys/fs/cgroup/kubepods.slice/kubepods-burstable.slice/kubepods-burstable-pod<uid>.slice/cpu.weight

# Check CPU max (the hard limit)
cat /sys/fs/cgroup/kubepods.slice/kubepods-burstable.slice/kubepods-burstable-pod<uid>.slice/cpu.max
# Output format: $MAX $PERIOD
# Example: 200000 100000 (means 2 CPU cores max)
```

Understanding the CPU statistics:

```bash
# Key metrics in cpu.stat:
# usage_usec - Total CPU time consumed in microseconds
# nr_throttled - Number of times the cgroup was throttled
# throttled_usec - Total time spent throttled

# Calculate throttle percentage
# If nr_throttled / nr_periods > 5%, the container needs more CPU

# Script to check throttling across all pods
for cg in /sys/fs/cgroup/kubepods.slice/*/kubepods-*-pod*.slice; do
  if [ -f "$cg/cpu.stat" ]; then
    name=$(basename $cg)
    throttled=$(grep nr_throttled "$cg/cpu.stat" | awk '{print $2}')
    periods=$(grep nr_periods "$cg/cpu.stat" | awk '{print $2}')
    if [ "$periods" -gt 0 ] 2>/dev/null; then
      pct=$(( throttled * 100 / periods ))
      if [ "$pct" -gt 5 ]; then
        echo "HIGH THROTTLE: $name - ${pct}%"
      fi
    fi
  fi
done
```

## Analyzing Memory Cgroup Resources

Memory cgroups control memory allocation and enforce limits:

```bash
# View memory statistics for a pod
cat /sys/fs/cgroup/kubepods.slice/kubepods-burstable.slice/kubepods-burstable-pod<uid>.slice/memory.stat

# Key fields:
# anon - Anonymous memory (heap, stack)
# file - File-backed memory (page cache)
# kernel - Kernel memory usage
# slab - Kernel slab allocator memory
# sock - TCP/UDP socket memory

# Check current memory usage
cat /sys/fs/cgroup/kubepods.slice/kubepods-burstable.slice/kubepods-burstable-pod<uid>.slice/memory.current

# Check memory limit
cat /sys/fs/cgroup/kubepods.slice/kubepods-burstable.slice/kubepods-burstable-pod<uid>.slice/memory.max

# Check how close to OOM
cat /sys/fs/cgroup/kubepods.slice/kubepods-burstable.slice/kubepods-burstable-pod<uid>.slice/memory.events
# Key events:
# low - Number of times memory usage hit the low boundary
# high - Number of times memory usage hit the high boundary
# max - Number of times memory usage hit the max limit
# oom - Number of times OOM killer was invoked
# oom_kill - Number of processes killed by OOM
```

## Analyzing IO Cgroup Resources

The IO controller manages disk I/O:

```bash
# View IO statistics
cat /sys/fs/cgroup/kubepods.slice/kubepods-burstable.slice/kubepods-burstable-pod<uid>.slice/io.stat
# Output format: major:minor rbytes=X wbytes=X rios=X wios=X

# Check IO limits if set
cat /sys/fs/cgroup/kubepods.slice/kubepods-burstable.slice/kubepods-burstable-pod<uid>.slice/io.max
```

## Using cadvisor Metrics

A more practical approach for ongoing analysis is to use cadvisor metrics through Prometheus:

```yaml
# cgroup-analysis-rules.yaml
# Prometheus rules for cgroup-level analysis
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: cgroup-analysis
  namespace: monitoring
spec:
  groups:
    - name: cgroup.analysis
      interval: 30s
      rules:
        # CPU throttling rate per container
        - record: container:cpu_cfs_throttled:ratio
          expr: >
            rate(container_cpu_cfs_throttled_seconds_total[5m])
            / rate(container_cpu_cfs_periods_total[5m])

        # Memory usage as percentage of limit
        - record: container:memory_usage:ratio
          expr: >
            container_memory_working_set_bytes
            / container_spec_memory_limit_bytes

        # Containers close to OOM
        - record: container:memory_oom_events:rate5m
          expr: >
            rate(container_oom_events_total[5m])
```

## Building a Cgroup Analysis Dashboard

Create a Grafana dashboard that visualizes cgroup data:

```json
{
  "panels": [
    {
      "title": "CPU Throttling by Pod",
      "type": "timeseries",
      "targets": [{
        "expr": "topk(10, container:cpu_cfs_throttled:ratio{container!=''})",
        "legendFormat": "{{namespace}}/{{pod}}/{{container}}"
      }]
    },
    {
      "title": "Memory Usage vs Limit",
      "type": "timeseries",
      "targets": [{
        "expr": "topk(10, container:memory_usage:ratio{container!=''})",
        "legendFormat": "{{namespace}}/{{pod}}/{{container}}"
      }]
    },
    {
      "title": "OOM Events",
      "type": "stat",
      "targets": [{
        "expr": "sum(increase(container_oom_events_total[24h]))",
        "legendFormat": "OOM Events (24h)"
      }]
    }
  ]
}
```

## Common Cgroup Issues and What They Mean

**High CPU throttling (nr_throttled > 5% of nr_periods)**
This means the container is hitting its CPU limit frequently. Either increase the CPU limit or optimize the application.

**Memory usage near max with high OOM events**
The container is running out of memory. Increase the memory limit or fix memory leaks in the application.

**Uneven CPU weight distribution**
If some pods have disproportionately high CPU weights, they may starve other pods during contention. Review resource requests to ensure fair distribution.

```bash
# Quick health check script for cgroup analysis
# Run inside the debug pod

echo "=== Cgroup Health Check ==="
echo ""
echo "Most throttled pods:"
for cg in /sys/fs/cgroup/kubepods.slice/*/kubepods-*-pod*.slice; do
  [ -f "$cg/cpu.stat" ] || continue
  throttled=$(grep throttled_usec "$cg/cpu.stat" | awk '{print $2}')
  echo "$(basename $cg): ${throttled}us throttled"
done | sort -t: -k2 -rn | head -5

echo ""
echo "Highest memory usage pods:"
for cg in /sys/fs/cgroup/kubepods.slice/*/kubepods-*-pod*.slice; do
  [ -f "$cg/memory.current" ] || continue
  usage=$(cat "$cg/memory.current")
  echo "$(basename $cg): $((usage / 1024 / 1024))MB"
done | sort -t: -k2 -rn | head -5
```

## Summary

Analyzing cgroup resources on Talos Linux gives you ground-level visibility into how your containers are actually using system resources. While tools like kubectl top and Prometheus provide convenient abstractions, sometimes you need to look directly at cgroup statistics to understand throttling, memory pressure, and IO contention. Use talosctl and temporary debug pods to inspect cgroup files when troubleshooting, and set up Prometheus recording rules for ongoing cgroup-level monitoring. The combination of cgroup v2 on Talos Linux with proper monitoring gives you the most accurate picture of resource utilization in your cluster.
