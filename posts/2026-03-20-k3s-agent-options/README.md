# How to Configure K3s Agent Options

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: k3s, Kubernetes, Rancher, Agent, Configuration, Worker Nodes

Description: A complete reference for K3s agent configuration options, covering server connection, resource tuning, and node customization.

## Introduction

K3s agents are the worker nodes in a K3s cluster. They run workloads (pods) and communicate with the K3s server to receive scheduling instructions. Agent nodes can be configured through a configuration file or command-line flags to customize how they connect to the server, manage resources, and present themselves to the cluster.

## Configuration File

Create the agent configuration at `/etc/rancher/k3s/config.yaml` before installing K3s as an agent:

```bash
sudo mkdir -p /etc/rancher/k3s
sudo nano /etc/rancher/k3s/config.yaml
```

## Core Connection Options

```yaml
# /etc/rancher/k3s/config.yaml - Agent configuration

# K3s server URL (required)

server: "https://192.168.1.100:6443"

# Authentication token (must match the server's token)
token: "SecureClusterToken"

# Alternatively, read the token from a file
# token-file: "/etc/rancher/k3s/token"
```

## Node Identity Options

```yaml
# Custom node name (default: hostname)
node-name: "worker-node-01"

# Primary IP address to advertise to the cluster
node-ip: "192.168.1.101"

# External IP (for nodes accessible from outside the cluster network)
node-external-ip: "203.0.113.10"

# Labels to apply to this node
node-label:
  - "tier=worker"
  - "zone=us-east-1a"
  - "hardware=gpu"

# Taints to apply to this node
node-taint:
  - "dedicated=gpu:NoSchedule"
```

## Container Runtime Options

```yaml
# Container runtime socket path (default: /run/k3s/containerd/containerd.sock)
# container-runtime-endpoint: "unix:///run/containerd/containerd.sock"

# Pause container image
pause-image: "rancher/mirrored-pause:3.6"

# Use a custom snapshotter for containerd
# snapshotter: "overlayfs"

# Private registry configuration file
private-registry: "/etc/rancher/k3s/registries.yaml"
```

## Kubelet Configuration

```yaml
# Arguments passed directly to the kubelet
kubelet-arg:
  # Maximum number of pods on this node
  - "max-pods=110"

  # Resource reservations for Kubernetes components
  - "kube-reserved=cpu=200m,memory=256Mi"

  # Resource reservations for system processes
  - "system-reserved=cpu=200m,memory=256Mi"

  # Hard eviction thresholds
  - "eviction-hard=memory.available<100Mi,nodefs.available<10%,nodefs.inodesFree<5%,imagefs.available<15%,imagefs.inodesFree<5%"

  # Soft eviction thresholds with grace periods
  - "eviction-soft=memory.available<200Mi,nodefs.available<15%"
  - "eviction-soft-grace-period=memory.available=1m30s,nodefs.available=1m30s"

  # Log rotation
  - "container-log-max-size=50Mi"
  - "container-log-max-files=5"

  # Image garbage collection
  - "image-gc-high-threshold=85"
  - "image-gc-low-threshold=70"

  # Graceful shutdown
  - "shutdown-grace-period=60s"
  - "shutdown-grace-period-critical-pods=20s"

  # Node status update frequency
  - "node-status-update-frequency=10s"
```

## Networking Options

```yaml
# Override default flannel interface
# flannel-iface: "eth0"

# Override default flannel config file
# flannel-conf: "/etc/rancher/k3s/flannel/net-conf.json"

# Override default flannel CNI config file
# flannel-cni-conf: "/etc/rancher/k3s/flannel/10-flannel.conflist"

# Resolv.conf for pods
resolv-conf: "/etc/resolv.conf"
```

## Data Directory

```yaml
# Override the default data directory (/var/lib/rancher/k3s)
# Useful for mounting a fast SSD on a separate path
data-dir: "/var/lib/rancher/k3s"
```

## Security Options

```yaml
# Error if kernel tunables differ from kubelet defaults
protect-kernel-defaults: true

# SELinux support
selinux: false  # Set to true on SELinux-enabled nodes (RHEL, Fedora)
```

## Complete Agent Configuration Examples

### Standard Worker Node

```yaml
# /etc/rancher/k3s/config.yaml - Standard worker node

server: "https://192.168.1.100:6443"
token: "ClusterToken"

node-name: "worker-01"
node-ip: "192.168.1.101"

node-label:
  - "tier=worker"
  - "region=us-east"

kubelet-arg:
  - "max-pods=110"
  - "kube-reserved=cpu=200m,memory=256Mi"
  - "system-reserved=cpu=200m,memory=256Mi"
  - "eviction-hard=memory.available<100Mi,nodefs.available<10%,nodefs.inodesFree<5%,imagefs.available<15%,imagefs.inodesFree<5%"
  - "container-log-max-size=50Mi"
  - "container-log-max-files=5"
  - "shutdown-grace-period=60s"
```

### GPU Worker Node

```yaml
# /etc/rancher/k3s/config.yaml - GPU worker node

server: "https://192.168.1.100:6443"
token: "ClusterToken"

node-name: "gpu-worker-01"
node-ip: "192.168.1.110"

# Labels for GPU workload targeting
node-label:
  - "tier=gpu-worker"
  - "accelerator=nvidia-tesla-v100"
  - "nvidia.com/gpu=true"

# Taint to prevent non-GPU workloads
node-taint:
  - "nvidia.com/gpu=present:NoSchedule"

kubelet-arg:
  - "max-pods=50"
  - "kube-reserved=cpu=500m,memory=1Gi"
  - "system-reserved=cpu=500m,memory=512Mi"
  - "eviction-hard=memory.available<500Mi,nodefs.available<10%,nodefs.inodesFree<5%,imagefs.available<15%,imagefs.inodesFree<5%"
```

### High-Memory Worker Node

```yaml
# /etc/rancher/k3s/config.yaml - High-memory worker (64GB+ RAM)

server: "https://192.168.1.100:6443"
token: "ClusterToken"

node-name: "highmem-worker-01"

node-label:
  - "tier=worker"
  - "memory=high"

kubelet-arg:
  - "max-pods=250"
  - "kube-reserved=cpu=1,memory=2Gi"
  - "system-reserved=cpu=500m,memory=1Gi"
  - "eviction-hard=memory.available<1Gi,nodefs.available<10%,nodefs.inodesFree<5%,imagefs.available<15%,imagefs.inodesFree<5%"
  - "image-gc-high-threshold=80"
  - "image-gc-low-threshold=60"
  - "shutdown-grace-period=120s"
  - "shutdown-grace-period-critical-pods=30s"
```

### Edge/IoT Worker Node (Resource-Constrained)

```yaml
# /etc/rancher/k3s/config.yaml - Edge node with limited resources

server: "https://192.168.1.100:6443"
token: "ClusterToken"

node-name: "edge-node-01"

node-label:
  - "tier=edge"
  - "device-type=iot-gateway"
  - "location=warehouse-a"

kubelet-arg:
  - "max-pods=20"
  - "kube-reserved=cpu=100m,memory=128Mi"
  - "system-reserved=cpu=100m,memory=64Mi"
  - "eviction-hard=memory.available<64Mi,nodefs.available<5%,nodefs.inodesFree<5%,imagefs.available<15%,imagefs.inodesFree<5%"
  - "container-log-max-size=10Mi"
  - "container-log-max-files=2"
  - "image-gc-high-threshold=90"
  - "image-gc-low-threshold=80"
```

## Installing with the Configuration File

```bash
# Ensure config.yaml is in place before installing
sudo mkdir -p /etc/rancher/k3s
sudo tee /etc/rancher/k3s/config.yaml > /dev/null <<EOF
server: "https://192.168.1.100:6443"
token: "ClusterToken"
node-label:
  - "tier=worker"
EOF

# Install K3s as agent
curl -sfL https://get.k3s.io | \
    INSTALL_K3S_EXEC="agent" \
    sudo sh -

# Verify the agent joined
sudo systemctl status k3s-agent
```

## Verifying Agent Configuration

```bash
# From the server, check the node's labels
kubectl get node worker-01 --show-labels

# Check kubelet arguments from the K3s agent logs
sudo journalctl -u k3s-agent -b | grep "Running kubelet" | tail -n 1 | grep -E "max-pods|reserved|eviction"

# Check node capacity and allocatable resources
kubectl describe node worker-01 | grep -A 10 "Capacity:"
kubectl describe node worker-01 | grep -A 10 "Allocatable:"
```

## Conclusion

K3s agent options give you precise control over how worker nodes present themselves to the cluster and how they manage local resources. By defining appropriate resource reservations, eviction thresholds, node labels, and taints in the configuration file, you can create purpose-built worker nodes optimized for specific workload types - whether that's general-purpose compute, GPU inference, high-memory databases, or lightweight edge processing.
