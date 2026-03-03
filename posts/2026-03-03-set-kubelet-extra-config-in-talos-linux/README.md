# How to Set Kubelet Extra Config in Talos Linux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, kubelet, Kubernetes, Machine Configuration, Node Configuration

Description: A comprehensive guide to configuring kubelet extra settings in Talos Linux for resource management, pod limits, and node-level Kubernetes tuning.

---

The kubelet is the node agent that runs on every machine in a Kubernetes cluster. It manages pods, reports node status, handles resource allocation, and enforces container runtime policies. Talos Linux configures the kubelet with reasonable defaults, but production workloads often require tuning - adjusting pod limits, configuring image garbage collection, setting eviction thresholds, enabling feature gates, or tweaking resource reservation.

This guide shows you how to configure kubelet extra settings in Talos Linux through the machine configuration.

## Kubelet Configuration in Talos

Talos exposes kubelet configuration through two mechanisms: `cluster.kubelet.extraArgs` for command-line flags and `cluster.kubelet.extraConfig` for the KubeletConfiguration API. The `extraConfig` approach is preferred because it covers more settings and uses the structured Kubernetes configuration format.

```yaml
# Basic kubelet extra configuration
machine:
  kubelet:
    extraArgs:
      rotate-server-certificates: "true"
    extraConfig:
      maxPods: 250
      serializeImagePulls: false
```

Note that in the Talos config, kubelet settings can appear under both `machine.kubelet` and `cluster.kubelet` depending on the specific field. Check the Talos documentation for your version.

## Setting Pod Limits

By default, Kubernetes allows 110 pods per node. For larger nodes or specific workloads, you might need more:

```yaml
# Increase the maximum number of pods per node
machine:
  kubelet:
    extraConfig:
      maxPods: 250
```

If you are running many small pods or DaemonSets across a large cluster, the default of 110 can be a bottleneck. However, increasing it too much can strain the kubelet's performance, so test with your actual workload patterns.

## Image Garbage Collection

The kubelet automatically cleans up unused container images when disk space gets low. You can tune the thresholds:

```yaml
# Configure image garbage collection
machine:
  kubelet:
    extraConfig:
      imageGCHighThresholdPercent: 85
      imageGCLowThresholdPercent: 80
      imageMinimumGCAge: "2m"
```

When disk usage exceeds `imageGCHighThresholdPercent`, the kubelet starts removing unused images until usage drops below `imageGCLowThresholdPercent`. The `imageMinimumGCAge` prevents recently pulled images from being removed immediately.

## Eviction Thresholds

Eviction thresholds determine when the kubelet starts evicting pods due to resource pressure:

```yaml
# Configure eviction thresholds
machine:
  kubelet:
    extraConfig:
      evictionHard:
        memory.available: "500Mi"
        nodefs.available: "10%"
        nodefs.inodesFree: "5%"
        imagefs.available: "15%"
      evictionSoft:
        memory.available: "1Gi"
        nodefs.available: "15%"
      evictionSoftGracePeriod:
        memory.available: "1m30s"
        nodefs.available: "2m"
      evictionMaxPodGracePeriod: 60
```

Hard eviction thresholds trigger immediate pod eviction with no grace period. Soft eviction thresholds give pods a grace period to clean up. Setting these correctly prevents node crashes from resource exhaustion while giving workloads a chance to shut down gracefully.

## Resource Reservation

Reserve resources for system processes to prevent workloads from consuming everything:

```yaml
# Reserve resources for system components
machine:
  kubelet:
    extraConfig:
      systemReserved:
        cpu: "500m"
        memory: "1Gi"
        ephemeral-storage: "2Gi"
      kubeReserved:
        cpu: "200m"
        memory: "512Mi"
        ephemeral-storage: "1Gi"
      enforceNodeAllocatable:
        - pods
        - system-reserved
        - kube-reserved
```

`systemReserved` sets aside resources for OS processes (Talos services, containerd). `kubeReserved` reserves resources for Kubernetes components (kubelet, kube-proxy). The `enforceNodeAllocatable` field determines which reservations are actually enforced through cgroups.

## Configuring Container Log Settings

Control how the kubelet manages container logs:

```yaml
# Container log management
machine:
  kubelet:
    extraConfig:
      containerLogMaxSize: "50Mi"
      containerLogMaxFiles: 5
```

Without these limits, a chatty container can fill up disk space with logs. The kubelet rotates logs when they reach `containerLogMaxSize` and keeps at most `containerLogMaxFiles` rotated copies.

## Image Pull Settings

Configure how the kubelet pulls container images:

```yaml
# Image pull configuration
machine:
  kubelet:
    extraConfig:
      serializeImagePulls: false
      maxParallelImagePulls: 5
      registryPullQPS: 10
      registryBurst: 20
```

Setting `serializeImagePulls` to `false` and configuring parallel pulls can significantly speed up node startup and pod scheduling on nodes with fast network connections.

## Kubelet Extra Args

For settings that are not part of the KubeletConfiguration API, use `extraArgs`:

```yaml
# Kubelet extra command-line arguments
machine:
  kubelet:
    extraArgs:
      # Enable server certificate rotation
      rotate-server-certificates: "true"

      # Set the node IP explicitly
      node-ip: "192.168.1.100"

      # Cloud provider settings (if applicable)
      cloud-provider: "external"

      # Container runtime settings
      container-runtime-endpoint: "unix:///run/containerd/containerd.sock"
```

## Feature Gates

Enable kubelet-specific feature gates:

```yaml
# Enable kubelet feature gates
machine:
  kubelet:
    extraArgs:
      feature-gates: >-
        GracefulNodeShutdown=true,
        TopologyManager=true,
        CPUManager=true
    extraConfig:
      cpuManagerPolicy: "static"
      topologyManagerPolicy: "best-effort"
```

The CPU Manager with a `static` policy pins guaranteed pods to specific CPU cores, which is valuable for latency-sensitive workloads. Topology Manager coordinates resource alignment across NUMA nodes.

## Node Labels and Taints via Kubelet

You can add labels and taints to nodes through the kubelet configuration:

```yaml
# Add node labels and taints
machine:
  kubelet:
    extraArgs:
      node-labels: "topology.kubernetes.io/zone=us-east-1a,node.kubernetes.io/instance-type=m5.xlarge"
    extraConfig:
      registerWithTaints:
        - key: "dedicated"
          value: "gpu"
          effect: "NoSchedule"
```

However, in Talos Linux, the preferred way to add node labels is through `machine.nodeLabels`:

```yaml
# Preferred way to set node labels in Talos
machine:
  nodeLabels:
    topology.kubernetes.io/zone: us-east-1a
    node.kubernetes.io/instance-type: m5.xlarge
```

## Graceful Node Shutdown

Configure how the kubelet handles node shutdown:

```yaml
# Graceful shutdown configuration
machine:
  kubelet:
    extraConfig:
      shutdownGracePeriod: "60s"
      shutdownGracePeriodCriticalPods: "20s"
```

This gives regular pods 40 seconds to shut down (60s minus 20s) and critical pods an additional 20 seconds. Graceful shutdown prevents data loss by giving pods time to finish in-flight requests and save state.

## Applying Kubelet Configuration

Apply the configuration to your nodes:

```bash
# Apply to worker nodes
talosctl apply-config \
  --nodes 192.168.1.110 \
  --file worker.yaml

# Apply to control plane nodes
talosctl apply-config \
  --nodes 192.168.1.100 \
  --file controlplane.yaml
```

Most kubelet configuration changes require a kubelet restart. Talos handles this automatically:

```bash
# Verify the kubelet restarted with new config
talosctl service kubelet --nodes 192.168.1.110

# Check kubelet logs for any configuration errors
talosctl logs kubelet --nodes 192.168.1.110 | tail -50
```

## Verifying Kubelet Configuration

Verify the applied configuration:

```bash
# Check the kubelet's active configuration
kubectl get --raw /api/v1/nodes/worker-01/proxy/configz | python3 -m json.tool

# Check node status for resource allocations
kubectl describe node worker-01 | grep -A 10 "Allocatable"
```

## Best Practices

Start with defaults and only customize what you need. Keep eviction thresholds conservative enough to protect node stability but not so aggressive that pods get evicted unnecessarily. Always reserve resources for system and Kubernetes components - leaving them to compete with workloads causes instability. Test configuration changes on a single node before rolling them out. Monitor kubelet metrics to understand the impact of your tuning.
