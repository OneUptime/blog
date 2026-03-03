# How to Optimize Memory Usage on Talos Linux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Memory Management, Performance, Kubernetes, Linux Kernel

Description: Practical strategies for optimizing memory usage on Talos Linux nodes to improve Kubernetes cluster efficiency and stability

---

Memory is one of the most critical resources on any Kubernetes node. Unlike CPU, which can be time-shared among processes, memory overcommitment leads to the OOM killer terminating processes or, worse, node instability. On Talos Linux, the minimal operating system footprint already gives you a head start - there are no unnecessary services consuming RAM. But there is still plenty you can do to optimize how memory is used by both the system and your workloads.

This guide covers kernel-level memory tuning, Kubernetes memory management, and practical strategies for getting the most out of your available RAM.

## Talos Linux Memory Overhead

One of the advantages of Talos Linux is its small memory footprint. A freshly booted Talos node uses roughly 300-500MB of RAM for the operating system, compared to 1-2GB for a typical Ubuntu or RHEL installation. This difference comes from Talos not running an SSH daemon, a package manager, a systemd-based init system with dozens of units, or any other services that a general-purpose distribution includes.

This means more of your node's memory is available for Kubernetes workloads. On a 64GB node, you might have 63GB available for pods instead of 62GB. That extra gigabyte matters when you are running hundreds of containers.

## Kernel Memory Parameters

The Linux kernel has many parameters that affect memory behavior. Here are the most important ones for Talos Linux nodes:

```yaml
# talos-machine-config.yaml
machine:
  sysctls:
    # Swappiness: how aggressively the kernel uses swap
    # 0 = only swap to prevent OOM
    # 100 = aggressively swap
    vm.swappiness: "1"

    # Overcommit behavior
    # 0 = heuristic overcommit (default)
    # 1 = always overcommit (good for Redis, forking)
    # 2 = strict no overcommit
    vm.overcommit_memory: "0"
    vm.overcommit_ratio: "80"

    # Cache pressure: how aggressively to reclaim dentries and inodes
    # Lower values keep more filesystem metadata cached
    vm.vfs_cache_pressure: "50"

    # Minimum free memory (in KB)
    # Reserves memory to prevent complete exhaustion
    vm.min_free_kbytes: "262144"    # 256MB reserved

    # Maximum number of memory map areas
    vm.max_map_count: "262144"

    # Watermark boost factor for memory reclaim
    vm.watermark_boost_factor: "15000"
    vm.watermark_scale_factor: "10"
```

Let me explain the rationale for these values.

Setting `vm.swappiness` to 1 tells the kernel to almost never swap. Since Kubernetes manages memory through cgroups and OOM behavior, letting the kernel swap out container memory creates unpredictable performance. However, setting it to 0 can cause OOM kills when the system could have survived by swapping temporarily. A value of 1 is a practical middle ground.

The `vm.min_free_kbytes` setting reserves 256MB of memory that the kernel will not give away. This prevents a situation where memory pressure is so high that the kernel itself cannot allocate the pages it needs to perform cleanup, creating a deadlock.

## Transparent Huge Pages

Transparent Huge Pages (THP) automatically combines regular 4KB pages into 2MB huge pages. While this can improve performance for some workloads, the background compaction that THP performs causes latency spikes and memory fragmentation. Most Kubernetes workloads perform better with THP disabled.

```yaml
# talos-machine-config.yaml
machine:
  install:
    extraKernelArgs:
      - transparent_hugepage=madvise   # Only use THP when explicitly requested
```

The `madvise` setting is a compromise. Applications that know they benefit from huge pages can opt in using `madvise(MADV_HUGEPAGE)`, while all other applications use regular pages. The more conservative option is `transparent_hugepage=never`, which disables THP entirely.

## Kubernetes Memory Management

Kubernetes divides node memory into several categories. Understanding these is essential for optimization:

```yaml
# talos-machine-config.yaml
machine:
  kubelet:
    extraArgs:
      # Memory reserved for system services (kubelet, containerd, etc.)
      system-reserved: "memory=1Gi"

      # Memory reserved for Kubernetes system components
      kube-reserved: "memory=1Gi"

      # Eviction thresholds
      eviction-hard: "memory.available<500Mi"
      eviction-soft: "memory.available<1Gi"
      eviction-soft-grace-period: "memory.available=2m"
```

The allocatable memory for pods is calculated as:

```text
Allocatable = Total Memory - system-reserved - kube-reserved - eviction-threshold
```

For a 64GB node with the settings above:
```text
Allocatable = 64GB - 1GB - 1GB - 0.5GB = 61.5GB
```

## Setting Proper Resource Requests and Limits

The single most impactful thing you can do for memory optimization is setting accurate resource requests and limits on every pod:

```yaml
# well-configured-pod.yaml
apiVersion: v1
kind: Pod
metadata:
  name: web-server
spec:
  containers:
  - name: nginx
    image: nginx:latest
    resources:
      requests:
        memory: "128Mi"          # What the container typically needs
      limits:
        memory: "256Mi"          # Maximum before OOM kill
```

Pods without memory requests are scheduled without memory guarantees and can be evicted at any time. Pods with requests higher than their actual usage waste allocatable capacity. Finding the right balance requires monitoring actual memory consumption over time.

## Memory QoS Classes

Kubernetes assigns pods to Quality of Service classes based on their resource configurations. These classes determine eviction priority when memory is scarce:

```yaml
# Guaranteed QoS - evicted last
apiVersion: v1
kind: Pod
metadata:
  name: critical-app
spec:
  containers:
  - name: app
    resources:
      requests:
        memory: "4Gi"
        cpu: "2"
      limits:
        memory: "4Gi"           # Requests = Limits = Guaranteed
        cpu: "2"

---
# Burstable QoS - evicted after BestEffort
apiVersion: v1
kind: Pod
metadata:
  name: batch-job
spec:
  containers:
  - name: worker
    resources:
      requests:
        memory: "1Gi"
      limits:
        memory: "4Gi"           # Limits > Requests = Burstable

---
# BestEffort QoS - evicted first
apiVersion: v1
kind: Pod
metadata:
  name: development-tool
spec:
  containers:
  - name: tool
    # No resource requests or limits = BestEffort
```

For production workloads, always use Guaranteed or Burstable QoS. BestEffort pods should only be used for development or non-critical batch jobs.

## Page Cache Management

The Linux page cache uses free memory to cache recently accessed files. This is generally beneficial, but on Kubernetes nodes with high I/O, the page cache can grow large and reduce available memory for pods.

```yaml
# talos-machine-config.yaml
machine:
  sysctls:
    # How aggressively to reclaim page cache
    vm.vfs_cache_pressure: "75"     # Slightly more aggressive than default (100)

    # Dirty page settings affect how much cache is used for write buffering
    vm.dirty_ratio: "10"
    vm.dirty_background_ratio: "5"
```

A lower `vfs_cache_pressure` value tells the kernel to prefer keeping filesystem metadata in cache, which speeds up operations like container image lookups. A higher value reclaims cache more aggressively, freeing memory for applications.

## Monitoring Memory Usage

Effective memory optimization requires monitoring. Deploy a monitoring stack and track these key metrics:

```bash
# Check node memory status
talosctl read /proc/meminfo --nodes 10.0.0.1

# Key fields to monitor:
# MemTotal: Total physical memory
# MemFree: Completely free memory
# MemAvailable: Memory available for new allocations (including reclaimable)
# Buffers: Memory used for disk buffers
# Cached: Memory used for page cache
# SwapTotal: Total swap space
# SwapFree: Free swap space
```

In Prometheus, track these metrics:

```text
# Available memory on each node
node_memory_MemAvailable_bytes

# Memory used by containers
container_memory_usage_bytes

# Memory working set (actual usage minus reclaimable cache)
container_memory_working_set_bytes

# OOM kill counter
node_vmstat_oom_kill
```

The difference between `container_memory_usage_bytes` and `container_memory_working_set_bytes` is important. The usage metric includes page cache, which can be reclaimed. The working set metric reflects actual memory consumption and is what Kubernetes uses for eviction decisions.

## Handling Memory Pressure

When memory runs low, Talos Linux (through kubelet) takes the following actions in order:

1. Soft eviction starts evicting BestEffort pods
2. If memory is still low after the grace period, Burstable pods are evicted
3. Hard eviction immediately kills pods when memory drops below the threshold
4. If all pod eviction fails, the kernel OOM killer activates

Configure your eviction thresholds based on your workload characteristics:

```yaml
# For nodes with many small pods
machine:
  kubelet:
    extraArgs:
      eviction-hard: "memory.available<200Mi"
      eviction-soft: "memory.available<500Mi"

# For nodes with fewer, larger pods
machine:
  kubelet:
    extraArgs:
      eviction-hard: "memory.available<1Gi"
      eviction-soft: "memory.available<2Gi"
```

## Conclusion

Memory optimization on Talos Linux starts with the advantage of a minimal OS footprint and builds on top of that with kernel tuning, proper Kubernetes configuration, and disciplined resource management. Set accurate memory requests and limits on all pods, configure appropriate eviction thresholds, and monitor actual memory consumption continuously. The combination of Talos Linux's lean design and proper memory management practices ensures your cluster runs efficiently without unexpected OOM kills or wasted capacity.
