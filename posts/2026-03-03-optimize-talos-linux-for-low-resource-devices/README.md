# How to Optimize Talos Linux for Low-Resource Devices

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Optimization, Low Resource, Edge Computing, Kubernetes

Description: Practical techniques for optimizing Talos Linux on memory-constrained and CPU-limited devices, including tuning Kubernetes components and reducing resource overhead.

---

Running Kubernetes on devices with limited CPU, memory, and storage is a real challenge. The default Kubernetes configuration assumes access to reasonably powerful hardware, and even Talos Linux's minimal footprint still leaves Kubernetes itself as a resource-hungry consumer. On devices with 2-4 GB of RAM and dual-core processors, you need to tune things carefully to leave enough room for actual workloads.

This guide covers practical optimization techniques for running Talos Linux on constrained hardware, from kernel-level tweaks to Kubernetes component tuning.

## Understanding the Resource Baseline

Before optimizing, understand where resources go on a default Talos installation:

| Component | CPU (idle) | Memory |
|-----------|-----------|---------|
| Talos OS + containerd | ~50m | ~150 MB |
| kubelet | ~50m | ~100 MB |
| etcd (control plane only) | ~100m | ~200 MB |
| kube-apiserver | ~100m | ~250 MB |
| kube-controller-manager | ~50m | ~100 MB |
| kube-scheduler | ~20m | ~50 MB |
| CoreDNS (2 replicas) | ~20m | ~30 MB each |
| kube-proxy | ~10m | ~30 MB |

On a control plane node, the baseline consumption is roughly 800 MB-1 GB of memory before any workloads. On a worker node, it is about 300-400 MB. This means on a 2 GB device, you have at best 1 GB left for your applications on a worker, and almost nothing on a control plane node.

## Reducing Kubernetes Control Plane Overhead

### Lower API Server Resource Usage

The API server is one of the largest consumers. Reduce its memory footprint by limiting the number of concurrent requests and the audit log retention:

```yaml
# Machine config patches for a leaner control plane
cluster:
  apiServer:
    extraArgs:
      max-requests-inflight: "100"        # Default is 400
      max-mutating-requests-inflight: "50" # Default is 200
      event-ttl: "1h"                      # Reduce from 1h default
      watch-cache-sizes: ""                # Disable watch cache sizing
    resources:
      requests:
        cpu: 100m
        memory: 256Mi
      limits:
        memory: 512Mi
```

### Tune etcd for Small Clusters

etcd's default settings are designed for large clusters. On a small edge deployment, you can significantly reduce its footprint:

```yaml
cluster:
  etcd:
    extraArgs:
      # Reduce snapshot count to compact more frequently
      snapshot-count: "5000"           # Default is 100000
      # Limit the database size
      quota-backend-bytes: "1073741824" # 1 GB instead of default 2 GB
      # Auto-compact to prevent unbounded growth
      auto-compaction-mode: periodic
      auto-compaction-retention: "5m"
      # Reduce heartbeat interval for faster leader election on slow networks
      heartbeat-interval: "500"
      election-timeout: "5000"
```

### Reduce Controller Manager and Scheduler Overhead

```yaml
cluster:
  controllerManager:
    extraArgs:
      # Reduce number of concurrent operations
      concurrent-deployment-syncs: "2"    # Default is 5
      concurrent-replicaset-syncs: "2"    # Default is 5
      concurrent-service-syncs: "1"       # Default is 1
      kube-api-qps: "10"                  # Default is 20
      kube-api-burst: "20"                # Default is 30
  scheduler:
    extraArgs:
      kube-api-qps: "10"
      kube-api-burst: "20"
```

## Reducing CoreDNS Resource Usage

By default, CoreDNS runs two replicas. On a small cluster, one replica is sufficient:

```yaml
# After cluster is running, scale down CoreDNS
# Apply this as a patch or use kubectl
apiVersion: apps/v1
kind: Deployment
metadata:
  name: coredns
  namespace: kube-system
spec:
  replicas: 1
  template:
    spec:
      containers:
        - name: coredns
          resources:
            requests:
              cpu: 10m
              memory: 20Mi
            limits:
              cpu: 50m
              memory: 64Mi
```

## Kernel and OS-Level Optimizations

### Memory Management

Configure the kernel to be more aggressive with memory reclamation:

```yaml
machine:
  sysctls:
    # Allow memory overcommit (important for Kubernetes)
    vm.overcommit_memory: "1"

    # Reduce swappiness (Talos has no swap, but this affects cache behavior)
    vm.swappiness: "10"

    # Free page cache more aggressively
    vm.vfs_cache_pressure: "200"

    # Reduce the minimum free memory threshold
    vm.min_free_kbytes: "16384"

    # Compact memory proactively
    vm.compact_memory: "1"
```

### Disable Transparent Huge Pages

Transparent Huge Pages (THP) can cause memory fragmentation and latency spikes on low-memory devices:

```yaml
machine:
  install:
    extraKernelArgs:
      - transparent_hugepage=never
```

### Reduce Kernel Log Buffers

```yaml
machine:
  install:
    extraKernelArgs:
      - log_buf_len=128K  # Reduce from default 1M
```

## Kubelet Tuning

The kubelet has several settings that affect resource usage:

```yaml
machine:
  kubelet:
    extraArgs:
      # Reduce image garbage collection thresholds
      image-gc-high-threshold: "70"
      image-gc-low-threshold: "50"

      # Reduce container log size
      container-log-max-size: "5Mi"
      container-log-max-files: "2"

      # Reduce kubelet event recording
      event-qps: "5"
      event-burst: "10"

      # Lower the pod eviction thresholds for low-memory devices
      eviction-hard: "memory.available<100Mi,nodefs.available<5%"
      eviction-soft: "memory.available<200Mi,nodefs.available<10%"
      eviction-soft-grace-period: "memory.available=30s,nodefs.available=1m"

      # Reduce node status update frequency
      node-status-update-frequency: "30s"
```

## Using Lightweight CNI Plugins

The default Flannel CNI in Talos is already lightweight, but if you switched to Cilium or Calico, consider going back to Flannel on constrained devices. Cilium's eBPF dataplane uses significantly more memory.

```yaml
# Stick with Flannel for low-resource devices
cluster:
  network:
    cni:
      name: flannel
```

If you need Cilium's features, use a minimal configuration:

```yaml
# Minimal Cilium for constrained devices
apiVersion: helm.cattle.io/v1
kind: HelmChart
metadata:
  name: cilium
spec:
  valuesContent: |
    operator:
      replicas: 1
      resources:
        requests:
          cpu: 10m
          memory: 64Mi
    resources:
      requests:
        cpu: 50m
        memory: 128Mi
    hubble:
      enabled: false  # Disable hubble to save resources
    bpf:
      preallocateMaps: false
```

## Container Image Optimization

On low-resource devices, the time and bandwidth to pull container images matters. Use small, efficient images:

```bash
# Compare image sizes
# Full ubuntu: ~77 MB
# Alpine: ~7 MB
# Distroless: ~3 MB
# Scratch (static binary): <10 MB
```

Pre-pull images to avoid runtime delays:

```yaml
# Pre-pull critical images in the machine config
machine:
  registries:
    mirrors:
      docker.io:
        endpoints:
          - https://registry-1.docker.io
        overridePath: false
```

## Workload Resource Management

Always set resource requests and limits on your pods. Without limits, a single runaway container can consume all available memory and destabilize the node:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: app
spec:
  containers:
    - name: app
      image: myapp:latest
      resources:
        requests:
          cpu: 25m
          memory: 32Mi
        limits:
          cpu: 100m
          memory: 128Mi
```

Use LimitRange to enforce defaults across a namespace:

```yaml
apiVersion: v1
kind: LimitRange
metadata:
  name: default-limits
  namespace: default
spec:
  limits:
    - default:
        cpu: 100m
        memory: 128Mi
      defaultRequest:
        cpu: 25m
        memory: 32Mi
      type: Container
```

## Monitoring Resource Usage

Keep a close eye on resource consumption:

```bash
# Check node resource usage
talosctl -n <NODE_IP> stats

# Check memory breakdown
talosctl -n <NODE_IP> memory

# Use kubectl top after installing metrics-server
kubectl top nodes
kubectl top pods --all-namespaces --sort-by=memory
```

## Disable Unnecessary Features

If you do not need certain Kubernetes features, disable them to save resources:

```yaml
cluster:
  proxy:
    disabled: false  # Keep kube-proxy unless using eBPF-based CNI
  apiServer:
    extraArgs:
      # Disable unused admission controllers
      enable-admission-plugins: "NamespaceLifecycle,LimitRanger,ServiceAccount,ResourceQuota"
```

## Wrapping Up

Running Talos Linux on low-resource devices requires deliberate tuning at every layer. The good news is that Talos's minimal base gives you a head start - it wastes far less on OS overhead than traditional distributions. By carefully configuring Kubernetes components, kernel parameters, and workload resource limits, you can run a functional Kubernetes cluster on devices with as little as 2 GB of RAM. The key is to measure first, tune based on actual usage data, and always set resource limits to prevent one workload from starving the rest.
