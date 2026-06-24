# How to Configure RKE2 Agent Configuration File

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RKE2, Kubernetes, Configuration, Worker Nodes, Agent, Rancher

Description: A comprehensive reference guide to all available options in the RKE2 agent configuration file for customizing your Kubernetes worker nodes.

The RKE2 agent configuration file (`/etc/rancher/rke2/config.yaml`) on worker nodes controls how the agent connects to the server cluster and how workloads run on the node. This guide provides a practical reference for common agent configuration options.

## Agent vs Server Configuration

The RKE2 agent configuration file is the same path as the server configuration, but agent nodes only support a subset of options. The key difference is that agent nodes do not run control plane components (etcd, API server, controller manager, scheduler).

## Common Agent Configuration Reference

```yaml
# /etc/rancher/rke2/config.yaml - Common agent configuration reference

# =====================

# REQUIRED: CLUSTER CONNECTION
# =====================

# URL of the RKE2 server to join
# This must point to the registration endpoint (port 9345)
server: https://10.0.0.10:9345

# Cluster authentication token
# Get from server: cat /var/lib/rancher/rke2/server/node-token
token: K10xxxxxxxxx

# Alternative: Read token from file
# token-file: /etc/rancher/rke2/token

# =====================
# NODE IDENTITY
# =====================

# Custom node name (defaults to hostname)
# Using hostname is recommended for consistency
# node-name: worker-01

# Primary IP address for this node
# Important when node has multiple network interfaces
node-ip: 192.168.1.20

# Optional: External/public IP address
# node-external-ip: 203.0.113.20

# =====================
# NODE LABELS
# =====================

# Labels to apply when this node registers
node-label:
  # Topology labels (important for zone-aware scheduling)
  - "topology.kubernetes.io/zone=us-east-1a"
  - "topology.kubernetes.io/region=us-east-1"

  # Custom workload type labels
  - "workload-class=general"
  - "environment=production"

  # Hardware capability labels
  # - "accelerator=gpu"
  # - "disk-type=nvme"

# =====================
# NODE TAINTS
# =====================

# Taints to apply when this node registers
# Prevents pods without matching tolerations from scheduling here
# node-taint:
  # Only schedule GPU workloads
  # - "nvidia.com/gpu=present:NoSchedule"

  # Dedicated for database workloads
  # - "dedicated=database:NoSchedule"

# =====================
# CONTAINER RUNTIME
# =====================

# Container runtime socket
# Defaults to embedded containerd
# container-runtime-endpoint: ""

# =====================
# SECURITY
# =====================

# Enable SELinux for containers
# Requires SELinux to be enabled on the host OS
# selinux: false

# Error if kernel tunables differ from kubelet defaults
# Required for CIS compliance
protect-kernel-defaults: true

# =====================
# KUBELET CONFIGURATION
# =====================

kubelet-arg:
  # ---- Security Settings ----
  # Disable anonymous authentication to kubelet API
  - "anonymous-auth=false"

  # Enable Webhook authorization
  - "authorization-mode=Webhook"

  # ---- Resource Management ----
  # Maximum pods per node (default: 110)
  - "max-pods=110"

  # Reserved resources for OS/system processes
  - "system-reserved=cpu=500m,memory=512Mi,ephemeral-storage=1Gi"

  # Reserved resources for Kubernetes components
  - "kube-reserved=cpu=500m,memory=512Mi,ephemeral-storage=1Gi"

  # ---- Eviction Thresholds ----
  # Hard eviction - immediately evict pods
  - "eviction-hard=memory.available<200Mi,nodefs.available<10%,imagefs.available<15%"

  # Soft eviction - evict pods after grace period
  - "eviction-soft=memory.available<500Mi,nodefs.available<15%"
  - "eviction-soft-grace-period=memory.available=2m30s,nodefs.available=2m30s"

  # ---- Container Logging ----
  - "container-log-max-size=50Mi"
  - "container-log-max-files=5"

  # ---- Image Management ----
  - "image-gc-high-threshold=85"
  - "image-gc-low-threshold=80"

  # ---- Certificate Management ----
  - "rotate-certificates=true"
  - "rotate-server-certificates=true"

  # ---- Performance ----
  # Event record QPS (0 uses the kubelet default)
  - "event-qps=0"

  # Streaming connection idle timeout
  - "streaming-connection-idle-timeout=5m"

  # ---- TLS ----
  - "tls-min-version=VersionTLS12"
  - "tls-cipher-suites=TLS_ECDHE_ECDSA_WITH_AES_128_GCM_SHA256,TLS_ECDHE_RSA_WITH_AES_128_GCM_SHA256,TLS_ECDHE_ECDSA_WITH_AES_256_GCM_SHA384,TLS_ECDHE_RSA_WITH_AES_256_GCM_SHA384"

# =====================
# KUBE-PROXY CONFIGURATION
# =====================

kube-proxy-arg:
  # Proxy mode on Linux: iptables (default), ipvs, or nftables
  - "proxy-mode=iptables"

  # Metrics bind address (restrict to localhost)
  - "metrics-bind-address=127.0.0.1:10249"

# =====================
# REGISTRY CONFIGURATION
# =====================

# Registry configuration is in /etc/rancher/rke2/registries.yaml
# See the registry mirror and private registry guides

# =====================
# CLOUD PROVIDER
# =====================

# Cloud provider name (needed for cloud-specific features)
# cloud-provider-name: aws

# Cloud provider configuration file
# cloud-provider-config: /etc/rancher/rke2/cloud-config

# =====================
# IMAGE CREDENTIALS
# =====================

# Credential provider for pulling from external registries
# image-credential-provider-config: /etc/rancher/rke2/credential-provider.yaml
# image-credential-provider-bin-dir: /usr/local/bin
```

## Node-Type-Specific Configurations

### High-Memory Node

```yaml
# config.yaml for high-memory database nodes
server: https://10.0.0.10:9345
token: K10xxxxx

node-label:
  - "node-role=database"
  - "memory-class=high"

node-taint:
  - "dedicated=database:NoSchedule"

kubelet-arg:
  - "max-pods=200"
  - "system-reserved=cpu=2,memory=4Gi"
  - "kube-reserved=cpu=1,memory=2Gi"
  - "eviction-hard=memory.available<1Gi,nodefs.available<10%"
```

### GPU Node

```yaml
# config.yaml for GPU-equipped nodes
server: https://10.0.0.10:9345
token: K10xxxxx

node-label:
  - "node-role=gpu-worker"
  - "accelerator=nvidia-a100"
  - "gpu-count=8"

node-taint:
  - "nvidia.com/gpu=present:NoSchedule"

kubelet-arg:
  # Device plugins are enabled by default in current Kubernetes releases
  # Install the NVIDIA device plugin separately
  - "max-pods=40"
```

## Conclusion

The RKE2 agent configuration file provides fine-grained control over how worker nodes join the cluster and how workloads run on them. Properly configuring node labels and taints enables intelligent workload placement, while kubelet tuning ensures node stability and security. For large clusters with diverse node types (compute, memory-optimized, GPU, etc.), maintaining separate configuration templates for each node type helps ensure consistency and makes scaling easier.
