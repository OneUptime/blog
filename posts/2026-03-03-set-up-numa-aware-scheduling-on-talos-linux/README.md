# How to Set Up NUMA-Aware Scheduling on Talos Linux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, NUMA, Scheduling, Performance, Kubernetes

Description: Guide to configuring NUMA-aware scheduling on Talos Linux for optimal performance on multi-socket servers

---

Non-Uniform Memory Access, or NUMA, is an architecture found in virtually all multi-socket servers and many modern single-socket systems. In a NUMA system, each CPU socket has its own local memory, and accessing remote memory on another socket takes significantly longer. If your Kubernetes workloads are not NUMA-aware, they may end up with CPUs on one socket accessing memory on another, resulting in 30-50% higher memory latency and reduced throughput.

On Talos Linux, setting up NUMA-aware scheduling involves configuring both the kernel and Kubernetes components to respect NUMA boundaries. This guide covers everything you need to get it right.

## Understanding NUMA Architecture

In a typical dual-socket server, you have two CPU sockets, each with its own memory controllers and local memory banks. The CPUs are connected by an interconnect (Intel UPI or AMD Infinity Fabric). When CPU 0 needs data from its local memory, the access takes about 80 nanoseconds. When it needs data from CPU 1's memory, the request must traverse the interconnect, taking 120-150 nanoseconds.

This difference seems small for a single access, but modern applications make billions of memory accesses per second. A workload that constantly crosses NUMA boundaries can lose 20-50% of its potential performance.

```
NUMA Node 0                    NUMA Node 1
+-------------------+          +-------------------+
| CPU Cores 0-15    |          | CPU Cores 16-31   |
|                   |  UPI/IF  |                   |
| Local Memory 128GB| <------> | Local Memory 128GB|
| ~80ns access      |  ~150ns  | ~80ns access      |
+-------------------+  remote  +-------------------+
```

## Checking Your NUMA Topology

Before configuring anything, understand your node's NUMA layout:

```bash
# Check NUMA node information
talosctl read /sys/devices/system/node/online --nodes 10.0.0.1

# Check which CPUs belong to which NUMA node
talosctl read /sys/devices/system/node/node0/cpulist --nodes 10.0.0.1
talosctl read /sys/devices/system/node/node1/cpulist --nodes 10.0.0.1

# Check memory per NUMA node
talosctl read /sys/devices/system/node/node0/meminfo --nodes 10.0.0.1
talosctl read /sys/devices/system/node/node1/meminfo --nodes 10.0.0.1
```

Understanding which CPUs and how much memory belong to each NUMA node is essential for planning your resource allocation.

## Configuring Kernel NUMA Settings

Talos Linux provides kernel parameters to control NUMA behavior:

```yaml
# talos-machine-config.yaml
machine:
  install:
    extraKernelArgs:
      # Enable automatic NUMA balancing
      - numa_balancing=enable

  sysctls:
    # NUMA balancing scan period (milliseconds)
    kernel.numa_balancing_scan_period_min_ms: "1000"
    kernel.numa_balancing_scan_period_max_ms: "60000"
    kernel.numa_balancing_scan_delay_ms: "1000"
    kernel.numa_balancing_scan_size_mb: "256"

    # Zone reclaim mode
    # 0 = disabled (prefer remote allocation over reclaim)
    # 1 = zone reclaim enabled
    vm.zone_reclaim_mode: "0"
```

The `numa_balancing` feature automatically migrates memory pages closer to the CPU that is accessing them. This helps when workloads are not perfectly pinned to a single NUMA node. However, for latency-sensitive workloads, automatic balancing can introduce jitter during page migration. In those cases, explicit NUMA pinning through the Topology Manager is better.

The `zone_reclaim_mode` setting determines what happens when a NUMA node runs out of free memory. With it set to 0, the kernel allocates from a remote node rather than aggressively reclaiming local memory. This is usually the right choice for Kubernetes workloads.

## Kubernetes Topology Manager

The Kubernetes Topology Manager coordinates resource allocation decisions across multiple hint providers (CPU Manager, Device Manager, Memory Manager) to ensure resources come from the same NUMA node. This is the key component for NUMA-aware pod scheduling.

```yaml
# talos-machine-config.yaml
machine:
  kubelet:
    extraArgs:
      topology-manager-policy: single-numa-node
      topology-manager-scope: container
      cpu-manager-policy: static
      memory-manager-policy: Static
      reserved-memory: "0:memory=2Gi;1:memory=2Gi"
      reserved-cpus: "0-1,16-17"
    extraConfig:
      topologyManagerPolicy: single-numa-node
      topologyManagerScope: container
      cpuManagerPolicy: static
      memoryManagerPolicy: Static
```

The topology manager policies available are:

- `none` - No NUMA awareness (default)
- `best-effort` - Try to align resources on a single NUMA node, but allow scheduling even if alignment is not possible
- `restricted` - Only allow scheduling if resources can be aligned, unless the pod has no topology preferences
- `single-numa-node` - All resources must come from a single NUMA node, or the pod is rejected

For performance-critical workloads, `single-numa-node` is the right choice. It guarantees that your pod's CPUs and memory are all on the same NUMA node.

## Memory Manager Configuration

The Memory Manager works with the Topology Manager to allocate memory from specific NUMA nodes. It must be enabled alongside the CPU Manager:

```yaml
# talos-machine-config.yaml
machine:
  kubelet:
    extraConfig:
      memoryManagerPolicy: Static
      reservedMemory:
        - numaNode: 0
          limits:
            memory: "2Gi"         # Reserve 2GB on node 0 for system
        - numaNode: 1
          limits:
            memory: "2Gi"         # Reserve 2GB on node 1 for system
```

The reserved memory on each NUMA node accounts for system services, kubelet, and container runtime overhead. Without this reservation, the Memory Manager might allocate all memory on a node to pods, leaving nothing for system processes.

## Deploying NUMA-Aware Pods

To benefit from NUMA-aware scheduling, your pods must be in the Guaranteed QoS class with integer CPU requests:

```yaml
# numa-aware-pod.yaml
apiVersion: v1
kind: Pod
metadata:
  name: database-server
spec:
  containers:
  - name: postgres
    image: postgres:16
    resources:
      requests:
        cpu: "8"                  # 8 whole CPUs
        memory: "32Gi"            # Memory will be allocated on same NUMA node
      limits:
        cpu: "8"
        memory: "32Gi"            # Must match requests for Guaranteed QoS
```

When this pod is scheduled, the Topology Manager ensures that all 8 CPUs and 32GB of memory come from the same NUMA node. If the node cannot satisfy this requirement, the pod will stay pending until a suitable node is available.

## Handling Multi-Container Pods

When a pod has multiple containers, the `topology-manager-scope` setting determines how alignment is enforced:

```yaml
# With scope=container (each container aligned independently)
apiVersion: v1
kind: Pod
metadata:
  name: multi-container-app
spec:
  containers:
  - name: main-app
    resources:
      requests:
        cpu: "4"
        memory: "16Gi"
      limits:
        cpu: "4"
        memory: "16Gi"
  - name: sidecar
    resources:
      requests:
        cpu: "1"
        memory: "1Gi"
      limits:
        cpu: "1"
        memory: "1Gi"
```

With `container` scope, each container gets its resources from a single NUMA node, but different containers in the same pod might use different NUMA nodes. With `pod` scope, all containers in the pod share the same NUMA node, which is more restrictive but ensures all inter-container communication stays local.

## NUMA and Device Plugins

If your workloads use hardware devices like GPUs, network adapters (SR-IOV), or FPGAs, NUMA alignment becomes even more important. Each PCIe device is physically attached to a specific NUMA node, and accessing a device from a remote NUMA node adds latency.

```yaml
# gpu-pod-with-numa.yaml
apiVersion: v1
kind: Pod
metadata:
  name: gpu-workload
spec:
  containers:
  - name: trainer
    image: nvidia/cuda:12.0-runtime
    resources:
      requests:
        cpu: "8"
        memory: "32Gi"
        nvidia.com/gpu: "1"       # GPU device request
      limits:
        cpu: "8"
        memory: "32Gi"
        nvidia.com/gpu: "1"
```

With `single-numa-node` policy, the Topology Manager will place the CPUs, memory, and GPU all on the same NUMA node. This ensures that GPU memory transfers and CPU-GPU communication use the shortest possible path.

## Monitoring NUMA Performance

Monitor NUMA-related metrics to verify your configuration is working:

```bash
# Check NUMA statistics
talosctl read /sys/devices/system/node/node0/numastat --nodes 10.0.0.1

# Key metrics:
# numa_hit - Memory allocations that stayed on the requested node
# numa_miss - Memory allocations that went to a different node
# numa_foreign - Allocations intended for this node but placed elsewhere
# local_node - Allocations from a local process
# other_node - Allocations from a remote process
```

A healthy NUMA configuration shows high `numa_hit` and `local_node` counts with very low `numa_miss` and `numa_foreign` counts.

## Applying and Verifying

Apply the NUMA configuration:

```bash
# Apply machine configuration
talosctl apply-config --nodes 10.0.0.1 --file talos-machine-config.yaml

# Reboot for kernel args
talosctl reboot --nodes 10.0.0.1

# Verify Topology Manager is active
talosctl read /var/lib/kubelet/cpu_manager_state --nodes 10.0.0.1
```

## Conclusion

NUMA-aware scheduling on Talos Linux ensures that your performance-sensitive workloads keep their CPUs, memory, and devices on the same physical NUMA node. The combination of kernel NUMA parameters, Kubernetes Topology Manager, CPU Manager, and Memory Manager provides comprehensive NUMA alignment. For dual-socket servers running latency-sensitive or memory-bandwidth-intensive workloads, proper NUMA configuration is not optional - it is a requirement for consistent performance. Start with the `single-numa-node` topology policy, verify your NUMA statistics, and adjust reservations based on your workload patterns.
