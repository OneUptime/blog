# How to Configure Kubelet Extra Args in Talos Linux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Kubelet, Kubernetes, Node Configuration, Cluster Management

Description: Learn how to configure kubelet extra arguments in Talos Linux to fine-tune node behavior, resource management, and pod scheduling.

---

The kubelet is the primary node agent in Kubernetes. It runs on every node and is responsible for managing pods, reporting node status, and communicating with the control plane. In Talos Linux, you cannot log into nodes and edit kubelet configuration files directly. Instead, you configure kubelet through the Talos machine configuration, which includes support for passing extra arguments to the kubelet process.

This guide covers how to use kubelet extra args in Talos Linux to customize node behavior for your specific workload requirements.

## How Kubelet Configuration Works in Talos

Talos Linux manages the kubelet as a system service. The kubelet configuration is derived from the machine configuration that you apply to each node. The relevant section is under `machine.kubelet`:

```yaml
machine:
  kubelet:
    image: ghcr.io/siderolabs/kubelet:v1.30.0
    extraArgs:
      key: value
    extraConfig:
      key: value
```

There are two ways to pass configuration to the kubelet: `extraArgs` for command-line flags and `extraConfig` for KubeletConfiguration fields. Both are useful in different situations.

## Using extraArgs

The `extraArgs` field lets you pass command-line flags directly to the kubelet binary. This is the most straightforward way to configure kubelet behavior:

```yaml
machine:
  kubelet:
    extraArgs:
      # Set the maximum number of pods per node
      max-pods: "200"
      # Configure logging verbosity
      v: "2"
      # Set the node status update frequency
      node-status-update-frequency: "5s"
      # Configure the pod manifest path for static pods
      pod-manifest-path: /etc/kubernetes/manifests
```

Each key-value pair maps to a kubelet command-line flag. The flag name is the key (without the leading dashes) and the value is always a string.

## Common Kubelet Extra Args

Here are some of the most commonly used kubelet extra args in production environments:

### Resource Management

```yaml
machine:
  kubelet:
    extraArgs:
      # Reserve resources for system daemons
      system-reserved: "cpu=500m,memory=512Mi"
      # Reserve resources for Kubernetes components
      kube-reserved: "cpu=500m,memory=512Mi"
      # Set the eviction threshold
      eviction-hard: "memory.available<500Mi,nodefs.available<10%"
      # Configure eviction soft thresholds with grace periods
      eviction-soft: "memory.available<1Gi"
      eviction-soft-grace-period: "memory.available=2m"
```

Resource reservations are critical in production. Without them, your pods can consume all available resources on the node, starving the kubelet and other system processes. This can lead to nodes becoming unresponsive.

### Container Runtime Settings

```yaml
machine:
  kubelet:
    extraArgs:
      # Set the container runtime endpoint
      container-runtime-endpoint: "unix:///var/run/containerd/containerd.sock"
      # Configure the image service endpoint
      image-service-endpoint: "unix:///var/run/containerd/containerd.sock"
      # Set the maximum number of containers per pod
      max-container-count: "50"
```

### Logging and Debugging

```yaml
machine:
  kubelet:
    extraArgs:
      # Increase log verbosity for debugging
      v: "4"
      # Set log directory
      log-dir: /var/log/kubelet
      # Enable logging to stderr
      logtostderr: "true"
```

## Using extraConfig for KubeletConfiguration

For settings that are part of the KubeletConfiguration API, use `extraConfig` instead of `extraArgs`:

```yaml
machine:
  kubelet:
    extraConfig:
      # Configure server TLS bootstrap
      serverTLSBootstrap: true
      # Set the cluster DNS
      clusterDNS:
        - 10.96.0.10
      # Configure container log settings
      containerLogMaxSize: "50Mi"
      containerLogMaxFiles: 5
      # Set the CPU manager policy
      cpuManagerPolicy: "static"
      # Reserve CPUs for system use
      reservedSystemCPUs: "0-1"
```

The `extraConfig` field accepts any valid KubeletConfiguration field. This is the preferred method for settings that map to the structured configuration rather than command-line flags.

## CPU Manager Policy

One of the most impactful kubelet configurations for performance-sensitive workloads is the CPU manager policy:

```yaml
machine:
  kubelet:
    extraConfig:
      cpuManagerPolicy: "static"
      cpuManagerReconcilePeriod: "5s"
```

With the static CPU manager policy, pods that request integer CPU values get dedicated CPU cores. This eliminates CPU contention and provides consistent performance for latency-sensitive applications.

To use this effectively, make sure your pods request whole CPU numbers:

```yaml
# Pod spec that benefits from static CPU manager
resources:
  requests:
    cpu: "2"
    memory: "4Gi"
  limits:
    cpu: "2"
    memory: "4Gi"
```

## Topology Manager

For NUMA-aware workloads, configure the topology manager:

```yaml
machine:
  kubelet:
    extraConfig:
      topologyManagerPolicy: "best-effort"
      topologyManagerScope: "container"
```

This helps the kubelet make better scheduling decisions for workloads that are sensitive to CPU and memory topology on multi-socket systems.

## Applying the Configuration

Apply your kubelet configuration to nodes:

```bash
# Apply to a specific node
talosctl apply-config --nodes 10.0.0.5 --file worker.yaml

# Or patch an existing configuration
cat > kubelet-patch.yaml <<EOF
machine:
  kubelet:
    extraArgs:
      max-pods: "200"
    extraConfig:
      serverTLSBootstrap: true
EOF

talosctl patch machineconfig --nodes 10.0.0.5 --patch @kubelet-patch.yaml
```

After applying, the kubelet will restart with the new configuration. You can verify the settings took effect:

```bash
# Check kubelet status
talosctl service kubelet --nodes 10.0.0.5

# View kubelet logs for any configuration errors
talosctl logs kubelet --nodes 10.0.0.5

# Verify the node is ready
kubectl get node <node-name> -o wide
```

## Validating Kubelet Configuration

To confirm your extra args are being applied, you can check the kubelet process arguments:

```bash
# List processes on the node
talosctl processes --nodes 10.0.0.5 | grep kubelet
```

You can also check the node's allocatable resources to verify resource reservations:

```bash
# Check node capacity and allocatable resources
kubectl describe node <node-name> | grep -A 10 "Allocatable"
```

## Common Pitfalls

There are a few things to watch out for when configuring kubelet extra args in Talos Linux.

First, some flags have been deprecated or removed across Kubernetes versions. Always check the kubelet documentation for your specific Kubernetes version.

Second, be careful with resource reservations. Setting them too high wastes resources. Setting them too low risks node instability. Start conservative and adjust based on monitoring data.

Third, remember that `extraArgs` and `extraConfig` can sometimes conflict if you set the same parameter in both places. Use `extraConfig` when possible, as it is the more modern approach.

## Conclusion

Kubelet extra args give you fine-grained control over how nodes behave in your Talos Linux cluster. The combination of `extraArgs` for command-line flags and `extraConfig` for KubeletConfiguration fields covers virtually every tuning parameter you might need. Start with sensible defaults, monitor your cluster, and adjust based on actual workload patterns. The most impactful settings for most production clusters are resource reservations, eviction thresholds, and max pods per node.
