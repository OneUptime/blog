# How to Use Cgroups Resource Analysis on Talos Linux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Cgroups, Resource Analysis, Kubernetes, Container Runtime, Performance

Description: Understand and analyze cgroups resource controls on Talos Linux for debugging container performance and resource allocation issues.

---

Control groups (cgroups) are the Linux kernel feature that makes container resource isolation possible. Every container running on your Talos Linux cluster has cgroup limits controlling its CPU, memory, I/O, and network resources. When a pod is being throttled, OOM-killed, or showing unexplained performance issues, understanding cgroups is essential for diagnosing the root cause. This guide explains how cgroups work on Talos Linux and how to analyze them for troubleshooting.

## What Are Cgroups

Cgroups is a Linux kernel feature that organizes processes into hierarchical groups and applies resource limits to those groups. In Kubernetes, each container gets its own cgroup, and the resource requests and limits you define in your pod spec translate directly to cgroup settings.

Talos Linux uses cgroups v2 (the unified hierarchy), which is the modern implementation that provides better resource control and simpler management compared to the older cgroups v1.

## How Kubernetes Uses Cgroups

When you define resources in a pod spec:

```yaml
resources:
  requests:
    cpu: "500m"
    memory: "256Mi"
  limits:
    cpu: "1000m"
    memory: "512Mi"
```

Kubernetes translates this into cgroup settings:

- **CPU request (500m)**: Sets `cpu.weight` proportional to the share of CPU this container should get under contention
- **CPU limit (1000m)**: Sets `cpu.max` to limit the container to 1 full CPU core per scheduling period
- **Memory request (256Mi)**: Used by the scheduler for placement, does not directly set a cgroup parameter
- **Memory limit (512Mi)**: Sets `memory.max` to 512 MiB. If the container exceeds this, it gets OOM-killed

## Cgroups Hierarchy on Talos Linux

Talos Linux organizes cgroups in a specific hierarchy:

```text
/sys/fs/cgroup/
  /init/                 # Talos init process
  /system/               # Talos system services
    /etcd/               # etcd service
    /kubelet/            # kubelet service
    /containerd/         # container runtime
  /kubepods/             # All Kubernetes pods
    /burstable/          # Burstable QoS pods
      /pod<uid>/         # Individual pod
        /container<id>/  # Individual container
    /besteffort/         # BestEffort QoS pods
    /guaranteed/         # Guaranteed QoS pods (at kubepods level)
```

## Step 1: Inspect Cgroups Using talosctl

Since Talos Linux has no shell access, you use talosctl to inspect cgroup data:

```bash
# List all cgroups on a node
talosctl list /sys/fs/cgroup --nodes 10.0.0.10

# View the kubepods cgroup hierarchy
talosctl list /sys/fs/cgroup/kubepods --nodes 10.0.0.10

# Check CPU settings for a specific container
# First, find the container's cgroup path
talosctl list /sys/fs/cgroup/kubepods/burstable --nodes 10.0.0.10
```

## Step 2: Read Cgroup Parameters

Read specific cgroup files to understand the resource controls applied to a container:

```bash
# CPU limit (max microseconds per period)
# Format: MAX PERIOD (e.g., "100000 100000" means 1 full CPU)
talosctl read /sys/fs/cgroup/kubepods/burstable/pod<uid>/<container-id>/cpu.max --nodes 10.0.0.10

# CPU weight (proportional share, default 100)
talosctl read /sys/fs/cgroup/kubepods/burstable/pod<uid>/<container-id>/cpu.weight --nodes 10.0.0.10

# Memory limit
talosctl read /sys/fs/cgroup/kubepods/burstable/pod<uid>/<container-id>/memory.max --nodes 10.0.0.10

# Current memory usage
talosctl read /sys/fs/cgroup/kubepods/burstable/pod<uid>/<container-id>/memory.current --nodes 10.0.0.10

# Memory usage breakdown
talosctl read /sys/fs/cgroup/kubepods/burstable/pod<uid>/<container-id>/memory.stat --nodes 10.0.0.10

# CPU throttling statistics
talosctl read /sys/fs/cgroup/kubepods/burstable/pod<uid>/<container-id>/cpu.stat --nodes 10.0.0.10

# I/O statistics
talosctl read /sys/fs/cgroup/kubepods/burstable/pod<uid>/<container-id>/io.stat --nodes 10.0.0.10
```

## Step 3: Identify Container Cgroup Paths

To find the cgroup path for a specific container, use kubectl:

```bash
# Get the container ID for a pod
kubectl get pod my-app-pod -o jsonpath='{.status.containerStatuses[0].containerID}'
# Output: containerd://abc123def456...

# Get the pod UID
kubectl get pod my-app-pod -o jsonpath='{.metadata.uid}'
# Output: 12345678-1234-1234-1234-123456789012

# The cgroup path will be:
# /sys/fs/cgroup/kubepods/<qos-class>/pod<uid>/<container-id>
```

You can also use talosctl to find containers:

```bash
# List all containers on a node
talosctl containers --nodes 10.0.0.10

# Get detailed info about a specific container
talosctl containers --nodes 10.0.0.10 -k | grep my-app
```

## Step 4: Analyze CPU Throttling

CPU throttling is one of the most common performance issues. When a container hits its CPU limit, the kernel pauses it until the next scheduling period. This causes latency spikes.

```bash
# Read CPU statistics
talosctl read /sys/fs/cgroup/kubepods/burstable/pod<uid>/<container-id>/cpu.stat --nodes 10.0.0.10

# Output:
# usage_usec 1234567890
# user_usec 1000000000
# system_usec 234567890
# nr_periods 100000
# nr_throttled 15000
# throttled_usec 500000000
```

Key values to check:

- **nr_periods**: Total number of CPU scheduling periods
- **nr_throttled**: Number of periods where the container was throttled
- **throttled_usec**: Total time spent throttled (microseconds)

The throttling ratio is: `nr_throttled / nr_periods`. If this is above 0.1 (10%), your container is frequently being throttled and you should consider increasing CPU limits.

You can also monitor this through Prometheus:

```promql
# CPU throttling ratio
rate(container_cpu_cfs_throttled_periods_total[5m])
/
rate(container_cpu_cfs_periods_total[5m])
```

## Step 5: Analyze Memory Usage and Pressure

Memory cgroups provide detailed information about memory consumption patterns:

```bash
# Current memory usage
talosctl read /sys/fs/cgroup/kubepods/burstable/pod<uid>/<container-id>/memory.current --nodes 10.0.0.10

# Memory limit
talosctl read /sys/fs/cgroup/kubepods/burstable/pod<uid>/<container-id>/memory.max --nodes 10.0.0.10

# Memory events (OOM kills, etc.)
talosctl read /sys/fs/cgroup/kubepods/burstable/pod<uid>/<container-id>/memory.events --nodes 10.0.0.10
# Output:
# low 0
# high 0
# max 3       <-- Number of times the cgroup hit its memory limit
# oom 1       <-- Number of OOM kills
# oom_kill 1  <-- Number of processes killed by OOM

# Detailed memory breakdown
talosctl read /sys/fs/cgroup/kubepods/burstable/pod<uid>/<container-id>/memory.stat --nodes 10.0.0.10
```

The `memory.stat` file shows:

- **anon**: Anonymous memory (heap, stack)
- **file**: File cache memory
- **slab**: Kernel slab allocations
- **sock**: Socket buffer memory
- **pgfault**: Page fault count
- **pgmajfault**: Major page fault count (indicates I/O pressure)

## Step 6: Analyze I/O Performance

Cgroups v2 provides I/O statistics per device:

```bash
# I/O statistics
talosctl read /sys/fs/cgroup/kubepods/burstable/pod<uid>/<container-id>/io.stat --nodes 10.0.0.10

# Output format:
# 254:0 rbytes=1234567 wbytes=7654321 rios=1000 wios=500 dbytes=0 dios=0

# I/O pressure information
talosctl read /sys/fs/cgroup/kubepods/burstable/pod<uid>/<container-id>/io.pressure --nodes 10.0.0.10

# Output:
# some avg10=0.50 avg60=0.30 avg300=0.10 total=123456
# full avg10=0.00 avg60=0.00 avg300=0.00 total=0
```

The pressure stall information (PSI) values tell you:

- **some**: Percentage of time at least one task is stalled on I/O
- **full**: Percentage of time all tasks are stalled on I/O

## Step 7: Node-Level Cgroup Analysis

Check the parent cgroup for the entire kubepods hierarchy to understand overall node resource allocation:

```bash
# Overall kubepods CPU allocation
talosctl read /sys/fs/cgroup/kubepods/cpu.max --nodes 10.0.0.10

# Reserved CPU for system services
talosctl read /sys/fs/cgroup/system/cpu.weight --nodes 10.0.0.10

# Overall memory allocation for pods
talosctl read /sys/fs/cgroup/kubepods/memory.max --nodes 10.0.0.10
```

## Step 8: Create Monitoring for Cgroup Metrics

Set up Prometheus alerts based on cgroup-level metrics:

```yaml
# cgroup-alerts.yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: cgroup-alerts
  namespace: monitoring
  labels:
    release: prometheus-stack
spec:
  groups:
    - name: cgroup-analysis
      rules:
        - alert: ContainerHighCPUThrottling
          expr: |
            rate(container_cpu_cfs_throttled_periods_total{container!=""}[5m])
            / rate(container_cpu_cfs_periods_total{container!=""}[5m]) > 0.25
          for: 10m
          labels:
            severity: warning
          annotations:
            summary: "Container {{ $labels.namespace }}/{{ $labels.pod }}/{{ $labels.container }} is heavily throttled"
            description: "CPU throttling ratio is {{ $value | humanizePercentage }}. Consider increasing CPU limits."

        - alert: ContainerMemoryNearOOM
          expr: |
            container_memory_working_set_bytes{container!=""}
            / container_spec_memory_limit_bytes{container!=""} > 0.95
          for: 5m
          labels:
            severity: critical
          annotations:
            summary: "Container {{ $labels.namespace }}/{{ $labels.pod }}/{{ $labels.container }} is near OOM"
            description: "Memory usage is at {{ $value | humanizePercentage }} of the limit. OOM kill is imminent."
```

## Conclusion

Understanding cgroups on Talos Linux gives you the deepest level of insight into container resource behavior. While Prometheus metrics give you trends and alerts, reading cgroup files directly through talosctl gives you the precise, current state of resource controls and usage. Use this knowledge to diagnose CPU throttling, memory pressure, and I/O bottlenecks that higher-level tools might miss. The combination of cgroup analysis with Prometheus metrics and Grafana dashboards gives you a complete resource monitoring toolkit for your Talos Linux cluster.
