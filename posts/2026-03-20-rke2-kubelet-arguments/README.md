# How to Configure RKE2 Kubelet Arguments

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RKE2, Kubernetes, Rancher, Kubelet, Configuration

Description: Learn how to pass custom kubelet arguments to RKE2 nodes to tune performance, resource management, and runtime behavior.

## Introduction

The kubelet is the primary node agent in Kubernetes, responsible for managing pod lifecycles, resource allocation, and communication with the container runtime. RKE2 allows you to pass custom kubelet arguments through its configuration file, enabling you to tune behavior beyond the defaults.

## How RKE2 Passes Kubelet Arguments

RKE2 uses the `kubelet-arg` key in `/etc/rancher/rke2/config.yaml` to pass arguments directly to the kubelet process. Each argument follows the standard kubelet flag format. For RKE2 v1.32 and newer, kubelet settings that are `KubeletConfiguration` fields can also be configured with drop-in files under `/var/lib/rancher/rke2/agent/etc/kubelet.conf.d/`.

## Basic Configuration

```bash
# Create or edit the RKE2 configuration file

sudo mkdir -p /etc/rancher/rke2
sudo tee /etc/rancher/rke2/config.yaml > /dev/null <<EOF
# RKE2 server/agent configuration

# Custom kubelet arguments
kubelet-arg:
  - "max-pods=250"
  - "node-status-update-frequency=10s"
  - "eviction-hard=memory.available<500Mi,nodefs.available<10%"
EOF
```

## Common Kubelet Arguments

### Increasing Maximum Pod Count

By default, Kubernetes allows 110 pods per node. For high-density environments, you may need more:

```yaml
# /etc/rancher/rke2/config.yaml
kubelet-arg:
  - "max-pods=250"
```

### Configuring Resource Reservations

Reserve resources for system processes and Kubernetes components to prevent resource starvation:

```yaml
kubelet-arg:
  # Reserve 500m CPU and 1Gi memory for Kubernetes system components
  - "kube-reserved=cpu=500m,memory=1Gi,ephemeral-storage=2Gi"
  # Reserve 500m CPU and 1Gi memory for OS system processes
  - "system-reserved=cpu=500m,memory=1Gi"
  # Eviction thresholds
  - "eviction-hard=memory.available<200Mi,nodefs.available<10%,nodefs.inodesFree<5%"
```

### Configuring Image Garbage Collection

Control when the kubelet garbage collects unused container images:

```yaml
kubelet-arg:
  # Start GC when disk usage exceeds 80%
  - "image-gc-high-threshold=80"
  # Stop GC when disk usage drops below 70%
  - "image-gc-low-threshold=70"
```

### Adjusting Log Rotation

```yaml
kubelet-arg:
  # Maximum size of a container log file before rotation
  - "container-log-max-size=50Mi"
  # Maximum number of rotated log files per container
  - "container-log-max-files=5"
```

### Enabling Feature Gates

Feature gates allow you to enable or disable alpha/beta Kubernetes features:

```yaml
kubelet-arg:
  # Enable specific feature gates
  - "feature-gates=RotateKubeletServerCertificate=true,GracefulNodeShutdown=true"
```

### Configuring Node Shutdown Behavior

Enable graceful node shutdown to allow pods to terminate cleanly:

```bash
sudo mkdir -p /var/lib/rancher/rke2/agent/etc/kubelet.conf.d
sudo tee /var/lib/rancher/rke2/agent/etc/kubelet.conf.d/99-shutdown.conf > /dev/null <<EOF
apiVersion: kubelet.config.k8s.io/v1beta1
kind: KubeletConfiguration
# Total time allowed for graceful shutdown
shutdownGracePeriod: 30s
# Time allocated for critical pods during shutdown
shutdownGracePeriodCriticalPods: 10s
EOF
```

### Configuring CPU Management Policy

For workloads that require dedicated CPU cores (e.g., real-time or latency-sensitive applications):

```yaml
kubelet-arg:
  # Use static CPU manager policy for Guaranteed QoS pods
  - "cpu-manager-policy=static"
  # Reserve CPUs for system use (not assignable to pods)
  - "reserved-cpus=0,1"
```

### Configuring Topology Manager

```yaml
kubelet-arg:
  # Align CPU, memory, and device allocations to NUMA nodes
  - "topology-manager-policy=best-effort"
```

## Full Example Configuration

Here is a comprehensive example for a high-performance worker node:

```yaml
# /etc/rancher/rke2/config.yaml
# Server URL (for agent nodes only)
server: https://192.168.1.100:9345
token: "MySecureToken123"

# Kubelet tuning
kubelet-arg:
  # Pod capacity
  - "max-pods=250"

  # Resource reservations
  - "kube-reserved=cpu=500m,memory=1Gi,ephemeral-storage=2Gi"
  - "system-reserved=cpu=500m,memory=512Mi"

  # Eviction policies
  - "eviction-hard=memory.available<200Mi,nodefs.available<10%,nodefs.inodesFree<5%"
  - "eviction-soft=memory.available<500Mi,nodefs.available<15%"
  - "eviction-soft-grace-period=memory.available=1m30s,nodefs.available=1m30s"

  # Log rotation
  - "container-log-max-size=50Mi"
  - "container-log-max-files=5"

  # Image garbage collection
  - "image-gc-high-threshold=80"
  - "image-gc-low-threshold=70"

  # Node status update frequency
  - "node-status-update-frequency=10s"
```

## Applying Configuration Changes

After modifying the configuration, restart the appropriate service:

```bash
# On server nodes
sudo systemctl restart rke2-server.service

# On agent nodes
sudo systemctl restart rke2-agent.service

# Verify the kubelet is running with your new arguments
ps aux | grep kubelet | grep -v grep
```

## Verifying Kubelet Arguments

```bash
# Check the kubelet process arguments
sudo cat /proc/$(pgrep kubelet)/cmdline | tr '\0' '\n'

# Alternatively, use the Kubernetes API to describe the node
kubectl describe node <NODE_NAME> | grep -A 20 "Capacity:"
kubectl describe node <NODE_NAME> | grep -A 20 "Allocatable:"
```

## Troubleshooting

If the kubelet fails to start after adding arguments, check the service logs:

```bash
# View kubelet-related logs
sudo journalctl -u rke2-server -n 200 --no-pager | grep kubelet
sudo journalctl -u rke2-agent -n 200 --no-pager | grep kubelet

# Common issue: invalid argument format
# Make sure arguments use the format "key=value" not "--key=value"
```

## Conclusion

Configuring kubelet arguments in RKE2 via the `kubelet-arg` configuration key gives you fine-grained control over node behavior. From increasing pod density to tuning resource reservations and enabling advanced features, customizing kubelet arguments is essential for production-grade Kubernetes deployments. Always test configuration changes in a non-production environment before applying them to live clusters.
