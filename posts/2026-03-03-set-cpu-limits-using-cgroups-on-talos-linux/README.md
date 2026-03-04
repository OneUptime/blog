# How to Set CPU Limits Using Cgroups on Talos Linux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, CPU Limits, Cgroups, Kubernetes, Resource Management, Performance

Description: Understand how CPU limits work through cgroups on Talos Linux and learn to configure them properly to avoid throttling and performance issues.

---

CPU limits in Kubernetes are one of the most misunderstood resource controls. On the surface, they seem simple: set a limit, and the container cannot use more CPU than that. But under the hood, CPU limits are implemented through the Linux CFS (Completely Fair Scheduler) bandwidth control mechanism in cgroups, and the way they work can lead to unexpected performance problems if you do not understand the mechanics.

On Talos Linux with cgroup v2, CPU limits are enforced through the `cpu.max` file, which defines a quota and period. This guide explains how CPU limits actually work, how to configure them properly, and when you might want to avoid them entirely.

## How CPU Limits Work in Cgroups

When you set a CPU limit of 1 core on a container, Kubernetes translates this into CFS bandwidth parameters:

```text
cpu.max = quota period
Example: cpu.max = 100000 100000

quota = 100000 microseconds (100ms)
period = 100000 microseconds (100ms)

This means: the container can use 100ms of CPU time every 100ms
Effectively: 1 full CPU core
```

For a limit of 500m (half a core):
```text
cpu.max = 50000 100000
quota = 50000 microseconds (50ms per 100ms period)
```

For a limit of 2 cores:
```text
cpu.max = 200000 100000
quota = 200000 microseconds (200ms per 100ms period)
```

The critical thing to understand is that this quota is enforced per period. If your application uses all 200ms of its quota in the first 50ms of the period, it will be throttled for the remaining 50ms, even if CPU is available.

## Setting CPU Limits in Kubernetes

The standard way to set CPU limits:

```yaml
# pod-with-cpu-limits.yaml
# Container with CPU request and limit
apiVersion: v1
kind: Pod
metadata:
  name: api-server
  namespace: production
spec:
  containers:
    - name: api
      image: my-api:latest
      resources:
        requests:
          # Minimum guaranteed CPU (maps to cpu.weight)
          cpu: "500m"
        limits:
          # Maximum CPU allowed (maps to cpu.max quota)
          cpu: "1000m"
```

## Understanding CPU Throttling

CPU throttling is when the CFS scheduler pauses a container because it has used its quota for the current period. You can observe throttling through cgroup statistics:

```bash
# Check throttling stats for a container
# Inside a debug pod with cgroup access:

cat /sys/fs/cgroup/kubepods.slice/kubepods-burstable.slice/kubepods-burstable-pod<uid>.slice/cpu.stat

# Key fields:
# nr_periods - Total number of CFS periods elapsed
# nr_throttled - Number of periods where the cgroup was throttled
# throttled_usec - Total time spent throttled in microseconds
```

Calculate the throttle percentage:

```bash
# Script to find throttled containers
for cg in /sys/fs/cgroup/kubepods.slice/*/kubepods-*-pod*.slice/cri-containerd-*.scope; do
  [ -f "$cg/cpu.stat" ] || continue

  periods=$(grep "^nr_periods" "$cg/cpu.stat" | awk '{print $2}')
  throttled=$(grep "^nr_throttled" "$cg/cpu.stat" | awk '{print $2}')

  if [ "$periods" -gt 100 ] 2>/dev/null; then
    pct=$((throttled * 100 / periods))
    if [ "$pct" -gt 0 ]; then
      echo "$(basename $cg): $pct% throttled ($throttled / $periods periods)"
    fi
  fi
done | sort -t: -k2 -rn
```

## Monitoring CPU Throttling with Prometheus

Set up alerts for excessive throttling:

```yaml
# cpu-throttle-alerts.yaml
# Alert on containers experiencing CPU throttling
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: cpu-throttle-alerts
  namespace: monitoring
spec:
  groups:
    - name: cpu.throttling
      rules:
        # Calculate throttle rate
        - record: container:cpu_cfs_throttled:ratio
          expr: >
            rate(container_cpu_cfs_throttled_periods_total{container!=""}[5m])
            /
            rate(container_cpu_cfs_periods_total{container!=""}[5m])

        # Alert when throttling exceeds 25%
        - alert: ContainerCPUThrottlingHigh
          expr: >
            container:cpu_cfs_throttled:ratio > 0.25
          for: 15m
          labels:
            severity: warning
          annotations:
            summary: >
              Container {{ $labels.container }} in pod
              {{ $labels.pod }} is being CPU throttled
              {{ $value | humanizePercentage }}
            description: >
              High CPU throttling may cause latency spikes.
              Consider increasing the CPU limit or removing it.
```

## Configuring the CFS Period

The default CFS period is 100ms. On Talos Linux, you can change this through the kubelet configuration:

```yaml
# talos-cfs-period.yaml
# Adjust CFS quota period for more granular scheduling
machine:
  kubelet:
    extraArgs:
      # Shorter period = more granular but higher overhead
      cpu-cfs-quota-period: "50ms"
      # Enable CFS quota enforcement
      cpu-cfs-quota: "true"
```

A shorter period (like 50ms or even 20ms) can reduce the burstiness of throttling at the cost of slightly higher scheduler overhead. This is particularly useful for latency-sensitive applications.

## The Case Against CPU Limits

There is a growing movement in the Kubernetes community to not set CPU limits, only CPU requests. Here is why:

```text
With CPU limits:
- Container gets throttled even when the node has spare CPU
- Latency spikes during throttling periods
- Wasted CPU capacity across the node

Without CPU limits (requests only):
- Container can burst beyond its request when CPU is available
- Better overall node utilization
- No artificial throttling
- Still guaranteed its requested amount during contention
```

To run without CPU limits on Talos:

```yaml
# pod-without-cpu-limits.yaml
# Set CPU request only, no limit
apiVersion: v1
kind: Pod
metadata:
  name: api-server
spec:
  containers:
    - name: api
      image: my-api:latest
      resources:
        requests:
          cpu: "500m"
          memory: "512Mi"
        limits:
          # Only set memory limit, not CPU
          memory: "1Gi"
```

Note that pods without CPU limits fall into the Burstable QoS class, not Guaranteed.

## Using CPU Manager Static Policy

For workloads that need dedicated CPU cores with no sharing, use the static CPU manager policy:

```yaml
# talos-static-cpu.yaml
# Enable static CPU manager for exclusive core assignment
machine:
  kubelet:
    extraConfig:
      cpuManagerPolicy: "static"
      cpuManagerReconcilePeriod: "10s"
      # Full physical cores only (no hyperthreading split)
      cpuManagerPolicyOptions:
        full-pcpus-only: "true"
```

Pods requesting Guaranteed QoS with integer CPU values get exclusive cores:

```yaml
# guaranteed-pod.yaml
# This pod gets dedicated CPU cores (no sharing)
apiVersion: v1
kind: Pod
metadata:
  name: latency-critical
spec:
  containers:
    - name: app
      image: latency-app:latest
      resources:
        requests:
          # Integer CPU request with matching limit = exclusive cores
          cpu: "2"
          memory: "4Gi"
        limits:
          cpu: "2"
          memory: "4Gi"
```

Verify the CPU assignment:

```bash
# Check which CPUs are assigned to the pod
kubectl exec latency-critical -- cat /sys/fs/cgroup/cpuset.cpus.effective
# Output: 2-3  (meaning CPUs 2 and 3 are exclusively assigned)
```

## CPU Pinning and NUMA Awareness

For maximum performance, combine CPU manager with topology manager:

```yaml
# talos-topology-config.yaml
# NUMA-aware CPU and memory allocation
machine:
  kubelet:
    extraConfig:
      cpuManagerPolicy: "static"
      topologyManagerPolicy: "single-numa-node"
      topologyManagerScope: "container"
```

This ensures that a container's CPUs and memory are allocated from the same NUMA node, avoiding expensive cross-NUMA memory access.

## Best Practices for CPU Configuration

```yaml
# Guidelines for different workload types:

# Web services (latency-sensitive)
# Use requests only, no CPU limits
resources:
  requests:
    cpu: "250m"
  limits:
    memory: "512Mi"  # Memory limit only

# Batch processing
# Set both request and limit to prevent runaway jobs
resources:
  requests:
    cpu: "1"
  limits:
    cpu: "2"
    memory: "2Gi"

# Real-time / latency-critical
# Use guaranteed QoS with integer CPU for core pinning
resources:
  requests:
    cpu: "4"
    memory: "8Gi"
  limits:
    cpu: "4"
    memory: "8Gi"
```

## Debugging CPU Issues

When troubleshooting CPU-related performance problems:

```bash
# Check actual CPU usage vs limits
kubectl top pods -n production --sort-by=cpu

# View CPU throttle metrics from Prometheus
curl -s "http://prometheus:9090/api/v1/query" \
  --data-urlencode 'query=topk(10, container:cpu_cfs_throttled:ratio{container!=""})' \
  | jq '.data.result[] | {pod: .metric.pod, container: .metric.container, throttle_rate: .value[1]}'

# Check CFS settings for a specific container via cgroup
kubectl exec cgroup-debug -n kube-system -- \
  cat /sys/fs/cgroup/kubepods.slice/kubepods-burstable.slice/kubepods-burstable-pod<uid>.slice/cpu.max
```

## Summary

CPU limits on Talos Linux are enforced through the cgroup v2 CFS bandwidth control mechanism. While they prevent any single container from monopolizing CPU, they can also cause unnecessary throttling when spare CPU is available. For latency-sensitive workloads, consider using CPU requests without limits. For workloads that need predictable, dedicated CPU allocation, use the static CPU manager policy with Guaranteed QoS pods. Monitor CPU throttling through Prometheus and set up alerts to catch containers that are being starved of CPU time. Understanding how the CFS scheduler works at the cgroup level helps you make informed decisions about CPU resource configuration on your Talos Linux clusters.
