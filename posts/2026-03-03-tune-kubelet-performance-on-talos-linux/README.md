# How to Tune kubelet Performance on Talos Linux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, kubelet, Kubernetes, Performance Tuning, Node Management

Description: Learn how to tune kubelet performance on Talos Linux for better pod management, faster scheduling, and improved node stability

---

The kubelet is the primary node agent in Kubernetes. It runs on every node and is responsible for managing pods, communicating with the API server, reporting node status, and handling container lifecycle events. When the kubelet is slow or misconfigured, the entire node suffers. Pods take longer to start, health checks become unreliable, and the node may even appear unhealthy to the control plane.

On Talos Linux, the kubelet is managed as a system service with its configuration provided through the machine configuration API. This guide covers the most important kubelet tuning parameters and how to apply them on Talos Linux.

## How kubelet Configuration Works in Talos

Unlike traditional distributions where you edit kubelet configuration files or systemd unit files, Talos Linux manages the kubelet through the machine configuration. You can pass arguments and configuration through two mechanisms:

```yaml
# talos-machine-config.yaml
machine:
  kubelet:
    # Command-line arguments
    extraArgs:
      cpu-manager-policy: static
      topology-manager-policy: single-numa-node

    # KubeletConfiguration fields
    extraConfig:
      maxPods: 250
      podPidsLimit: 4096
      serializeImagePulls: false
```

The `extraArgs` map directly to kubelet command-line flags. The `extraConfig` fields map to the KubeletConfiguration API object. Some settings are available in both, but `extraConfig` is the preferred method for most tuning parameters.

## Pod Density and Limits

The default maximum number of pods per node is 110. For nodes with ample resources, you can increase this:

```yaml
# talos-machine-config.yaml
machine:
  kubelet:
    extraConfig:
      maxPods: 250                    # Maximum pods per node
      podsPerCore: 0                  # 0 = no per-core limit
      podPidsLimit: 4096              # Max PIDs per pod
```

Increasing `maxPods` requires enough IP addresses in your pod CIDR. Each pod gets its own IP, so make sure your CNI network is sized appropriately. Also watch out for the kubelet's per-pod overhead in terms of monitoring, status reporting, and health checking.

For high-density nodes, also increase the system-level PID limit:

```yaml
machine:
  sysctls:
    kernel.pid_max: "4194304"         # Increase max PIDs system-wide
```

## Resource Reservation

Kubelet should reserve resources for system processes to prevent pods from consuming everything:

```yaml
# talos-machine-config.yaml
machine:
  kubelet:
    extraArgs:
      system-reserved: "cpu=500m,memory=1Gi,ephemeral-storage=10Gi"
      kube-reserved: "cpu=500m,memory=1Gi,ephemeral-storage=10Gi"
      enforce-node-allocatable: "pods,system-reserved,kube-reserved"
```

The `system-reserved` covers the OS, containerd, and Talos system services. The `kube-reserved` covers kubelet itself and kube-proxy. These reservations ensure that even under heavy pod load, the node's system services have enough resources to function.

Poorly configured reservations lead to two problems: too little reservation means system services starve under load, too much reservation wastes node capacity. Monitor actual system resource usage and adjust accordingly.

## Eviction Thresholds

Kubelet evicts pods when node resources become scarce. The eviction thresholds determine when this happens:

```yaml
# talos-machine-config.yaml
machine:
  kubelet:
    extraArgs:
      eviction-hard: "memory.available<500Mi,nodefs.available<10%,imagefs.available<15%"
      eviction-soft: "memory.available<1Gi,nodefs.available<15%,imagefs.available<20%"
      eviction-soft-grace-period: "memory.available=1m30s,nodefs.available=1m30s,imagefs.available=1m30s"
      eviction-max-pod-grace-period: "60"
      eviction-pressure-transition-period: "30s"
```

Hard eviction thresholds trigger immediate pod termination. Soft eviction thresholds start evicting pods after the grace period expires. The `eviction-pressure-transition-period` controls how long the node stays in a pressure condition after it has recovered, preventing rapid oscillation between pressure and no-pressure states.

## Image Garbage Collection

Container images accumulate on nodes over time. The kubelet's garbage collector removes unused images when disk usage exceeds configured thresholds:

```yaml
# talos-machine-config.yaml
machine:
  kubelet:
    extraConfig:
      imageGCHighThresholdPercent: 85   # Start GC when disk is 85% full
      imageGCLowThresholdPercent: 80    # Stop GC when disk drops to 80%
      imageMinimumGCAge: "2m"           # Minimum age before an image can be GC'd
```

For nodes that run many different container images (like CI/CD build nodes), you may want more aggressive garbage collection. For nodes running a stable set of images, less aggressive settings reduce unnecessary re-pulls.

## Container Log Management

Container logs can consume significant disk space. Configure the kubelet to manage log rotation:

```yaml
# talos-machine-config.yaml
machine:
  kubelet:
    extraConfig:
      containerLogMaxSize: "50Mi"       # Max size per log file
      containerLogMaxFiles: 5           # Keep 5 rotated log files
```

Without these settings, a single chatty container can fill up the node's disk, triggering evictions across all pods.

## Node Status Update Frequency

The kubelet periodically reports its status to the API server. The frequency of these updates affects how quickly the control plane detects node problems:

```yaml
# talos-machine-config.yaml
machine:
  kubelet:
    extraConfig:
      nodeStatusUpdateFrequency: "10s"    # Report status every 10 seconds
      nodeStatusReportFrequency: "5m"     # Full status report every 5 minutes
      syncFrequency: "1m"                 # Sync pod specs every minute
      runtimeRequestTimeout: "2m"         # Timeout for runtime operations
```

More frequent status updates provide faster failure detection but increase load on the API server. For large clusters (hundreds of nodes), consider less frequent updates to reduce API server load.

## CPU Manager Configuration

The CPU manager controls how CPUs are allocated to containers. The static policy provides guaranteed CPU allocation:

```yaml
# talos-machine-config.yaml
machine:
  kubelet:
    extraArgs:
      cpu-manager-policy: static
      cpu-manager-reconcile-period: "5s"
      reserved-cpus: "0-1"              # Reserve CPUs 0-1 for system
    extraConfig:
      cpuManagerPolicy: static
      cpuManagerReconcilePeriod: "5s"
      reservedSystemCPUs: "0-1"
```

With the static policy, pods in the Guaranteed QoS class with integer CPU requests get exclusive access to specific CPU cores. This eliminates CPU contention and cache thrashing for performance-critical workloads.

## Topology Manager

The topology manager coordinates resource allocation to respect hardware topology (NUMA, device locality):

```yaml
# talos-machine-config.yaml
machine:
  kubelet:
    extraConfig:
      topologyManagerPolicy: "best-effort"   # or single-numa-node, restricted
      topologyManagerScope: "container"       # or pod
```

Choose `single-numa-node` for maximum performance isolation, `best-effort` for general-purpose clusters, or `restricted` as a middle ground.

## Parallel Operations

Allow the kubelet to perform operations in parallel for faster pod management:

```yaml
# talos-machine-config.yaml
machine:
  kubelet:
    extraConfig:
      serializeImagePulls: false         # Pull images in parallel
      maxParallelImagePulls: 5           # Up to 5 concurrent pulls
      registryBurst: 20                  # Burst rate for registry requests
      registryPullQPS: 10               # Sustained QPS for registry requests
```

Parallel image pulls are essential for nodes that need to start many different pods quickly, such as during a deployment rollout or cluster scale-up.

## Monitoring kubelet Performance

Track kubelet metrics to identify tuning opportunities:

```bash
# Check kubelet metrics endpoint
talosctl read /var/lib/kubelet/config.yaml --nodes 10.0.0.1

# Key kubelet metrics to monitor in Prometheus:
# kubelet_pod_start_duration_seconds - Time to start a pod
# kubelet_pod_worker_duration_seconds - Pod sync duration
# kubelet_runtime_operations_duration_seconds - Container runtime latency
# kubelet_node_config_error - Configuration errors
# kubelet_evictions - Number of pod evictions
# kubelet_pleg_relist_duration_seconds - Pod lifecycle event latency
```

The PLEG (Pod Lifecycle Event Generator) relist duration is particularly important. If it exceeds 3 seconds regularly, the kubelet is struggling to keep up with pod status changes, and the node may become NotReady.

## Applying kubelet Configuration

Apply your kubelet tuning through talosctl:

```bash
# Apply the machine configuration
talosctl apply-config --nodes 10.0.0.1 --file talos-machine-config.yaml

# Most kubelet changes require a kubelet restart
# Talos handles this automatically when config changes

# Verify the kubelet is running with the new configuration
talosctl service kubelet --nodes 10.0.0.1

# Check for any errors in kubelet logs
talosctl logs kubelet --nodes 10.0.0.1 --tail 50
```

## Conclusion

Kubelet tuning on Talos Linux is about finding the right balance between performance, stability, and resource utilization. Start with proper resource reservation to protect system services, then tune pod limits and eviction thresholds based on your workload patterns. Enable parallel operations for faster pod startup, and configure the CPU manager and topology manager if you need performance isolation. Always monitor kubelet metrics to verify that your changes are having the intended effect and to catch problems before they impact your workloads.
