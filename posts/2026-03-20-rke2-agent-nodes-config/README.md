# How to Configure RKE2 Agent Nodes - Config

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RKE2, Kubernetes, Configuration, Worker Nodes, Rancher

Description: A comprehensive guide to configuring RKE2 agent (worker) nodes with all available configuration options for production Kubernetes workloads.

RKE2 agent nodes are the worker nodes that run your application workloads. They run the kubelet and kube-proxy components and connect to the RKE2 server for cluster membership. Proper agent node configuration affects workload scheduling, resource allocation, networking, and security. This guide covers all important configuration options for RKE2 agent nodes.

## Prerequisites

- An existing RKE2 server/cluster running
- Linux nodes for workers (Ubuntu, CentOS, Rocky Linux, etc.)
- Minimum 2 vCPUs and 4 GB RAM (more for production workloads)
- The cluster token from the server node

## Basic Agent Configuration

```yaml
# /etc/rancher/rke2/config.yaml - Basic agent configuration

# =====================

# CONNECTION SETTINGS
# =====================

# URL of the RKE2 server to join
server: https://10.0.0.10:9345

# Token for cluster authentication
# Get from server: cat /var/lib/rancher/rke2/server/node-token
token: K10abc123...

# =====================
# NODE IDENTITY
# =====================

# Explicit node name (defaults to hostname)
# node-name: worker-01

# Node IP address (important when node has multiple interfaces)
node-ip: 192.168.1.20

# Additional node labels
node-label:
  - "topology.kubernetes.io/zone=us-east-1a"
  - "topology.kubernetes.io/region=us-east-1"
  - "node-type=compute"
  - "workload-type=general"

# Node taints to prevent certain workloads
# node-taint:
#   - "dedicated=monitoring:NoSchedule"
```

## Advanced Agent Configuration

```yaml
# /etc/rancher/rke2/config.yaml - Advanced agent configuration

server: https://10.0.0.10:9345
token: K10abc123...
node-ip: 192.168.1.20

# =====================
# CONTAINER RUNTIME
# =====================

# Container runtime socket (defaults to embedded containerd)
# container-runtime-endpoint: unix:///run/containerd/containerd.sock

# Private registry mirror
# See registries.yaml configuration below

# =====================
# KUBELET CONFIGURATION
# =====================

kubelet-arg:
  # Disable anonymous authentication to kubelet API
  - "anonymous-auth=false"

  # Eviction thresholds to protect node stability
  - "eviction-hard=memory.available<200Mi,nodefs.available<10%,imagefs.available<15%"

  # Soft eviction thresholds
  - "eviction-soft=memory.available<500Mi,nodefs.available<15%,imagefs.available<20%"
  - "eviction-soft-grace-period=memory.available=2m30s,nodefs.available=2m30s"

  # Maximum pods per node
  - "max-pods=110"

  # Reserved resources for system daemons
  - "system-reserved=cpu=500m,memory=500Mi,ephemeral-storage=1Gi"

  # Reserved resources for Kubernetes components
  - "kube-reserved=cpu=500m,memory=500Mi,ephemeral-storage=1Gi"

  # Container log settings
  - "container-log-max-size=50Mi"
  - "container-log-max-files=5"

  # Image garbage collection
  - "image-gc-high-threshold=85"
  - "image-gc-low-threshold=80"

  # Certificate rotation
  - "rotate-certificates=true"

  # Protect kernel defaults (required for CIS compliance)
  - "protect-kernel-defaults=true"

  # Topology manager policy
  - "topology-manager-policy=best-effort"

# =====================
# KUBE-PROXY CONFIGURATION
# =====================

kube-proxy-arg:
  # Proxy mode: iptables or ipvs
  - "proxy-mode=iptables"

  # Metrics bind address
  - "metrics-bind-address=127.0.0.1:10249"
```

## Configure Private Registry Mirror

```yaml
# /etc/rancher/rke2/registries.yaml - Container registry configuration

mirrors:
  # Route Docker Hub pulls through internal registry
  "docker.io":
    endpoint:
    - "https://registry.internal.example.com/v2/docker.io"

  # Route GitHub Container Registry
  "ghcr.io":
    endpoint:
    - "https://registry.internal.example.com/v2/ghcr.io"

configs:
  "registry.internal.example.com":
    auth:
      username: "registry-user"
      password: "registry-password"
    tls:
      ca_file: "/etc/ssl/certs/internal-ca.crt"
```

## Dedicated Node Types with Taints and Labels

### GPU Worker Nodes

```yaml
# /etc/rancher/rke2/config.yaml - GPU worker configuration
server: https://10.0.0.10:9345
token: K10abc123...

node-label:
  - "node-role=gpu-worker"
  - "accelerator=nvidia-tesla-v100"

# Taint to only allow GPU workloads
node-taint:
  - "nvidia.com/gpu=present:NoSchedule"

# Install the NVIDIA device plugin in the cluster after the node joins.
```

### High-Memory Database Nodes

```yaml
# /etc/rancher/rke2/config.yaml - Database worker configuration
server: https://10.0.0.10:9345
token: K10abc123...

node-label:
  - "node-role=database"
  - "disk-type=ssd"

# Taint to only allow database workloads
node-taint:
  - "workload=database:NoSchedule"

kubelet-arg:
  # Allow more pods on high-resource node
  - "max-pods=200"
  # Reserve more memory for OS
  - "system-reserved=cpu=1,memory=2Gi"
  # Increase eviction threshold for memory-intensive workloads
  - "eviction-hard=memory.available<1Gi"
```

## Install and Start the Agent

```bash
# Install RKE2 agent
curl -sfL https://get.rke2.io | sudo env INSTALL_RKE2_TYPE="agent" sh -

# Create the configuration
sudo mkdir -p /etc/rancher/rke2/

# Apply your configuration from above
cat <<EOF | sudo tee /etc/rancher/rke2/config.yaml
server: https://10.0.0.10:9345
token: YOUR_NODE_TOKEN

node-ip: $(hostname -I | awk '{print $1}')

node-label:
  - "topology.kubernetes.io/zone=us-east-1a"

kubelet-arg:
  - "anonymous-auth=false"
  - "max-pods=110"
  - "rotate-certificates=true"
  - "protect-kernel-defaults=true"
EOF

# Enable and start the agent
sudo systemctl enable rke2-agent.service
sudo systemctl start rke2-agent.service

# Check status
sudo systemctl status rke2-agent.service

# Monitor logs
sudo journalctl -u rke2-agent -f
```

## Verify Agent Node Registration

```bash
# On the server node, verify the agent joined
kubectl get nodes

# Check the node details
kubectl describe node <worker-node-name>

# Verify labels were applied
kubectl get node <worker-node-name> --show-labels

# Check pods scheduled on the node
kubectl get pods -A --field-selector spec.nodeName=<worker-node-name>
```

## Conclusion

Properly configuring RKE2 agent nodes is essential for workload performance, stability, and security. By using node labels and taints, you can create specialized node groups for different workload types. The kubelet configuration allows fine-tuning of resource allocation and eviction policies. For production environments, always configure resource reservations to prevent system processes from being starved by application workloads, and enable certificate rotation for ongoing security.
