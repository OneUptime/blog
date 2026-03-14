# Configuring a Master Node for Cilium Installation Using K3s

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Cilium, Kubernetes, K3s

Description: Configure the K3s master (server) node correctly for Cilium CNI deployment, including kernel parameters, K3s server flags, and Cilium-specific node settings.

---

## Introduction

The master node in a K3s cluster requires specific configuration for Cilium to function correctly. Unlike worker nodes, the master runs the K3s server process which embeds the API server, scheduler, and controller manager. Cilium needs to communicate with these components and also manage the networking for control plane pods.

Proper master node configuration ensures Cilium can connect to the Kubernetes API, manage eBPF programs on the node, and handle both control plane and workload traffic. Misconfigurations on the master node can prevent the entire cluster from having a functional network.

This guide covers the complete master node configuration from kernel parameters through K3s server flags and Cilium-specific settings.

## Prerequisites

- A Linux server (Ubuntu 20.04+, RHEL 8+, or similar) designated as the K3s master
- Root or sudo access to the server
- At least 2 CPUs and 4GB RAM
- Kernel version 4.19+ (5.4+ recommended for full Cilium features)

## Configuring Kernel Parameters

Set kernel parameters required for Cilium's eBPF datapath:

```bash
# Configure kernel parameters for Cilium
# These settings are required for eBPF operation and IP forwarding
cat > /etc/sysctl.d/99-cilium.conf << 'EOF'
# Enable IP forwarding for pod networking
net.ipv4.ip_forward = 1
net.ipv6.conf.all.forwarding = 1

# Increase BPF JIT limit for complex programs
net.core.bpf_jit_enable = 1

# Increase conntrack table size for high-traffic clusters
net.netfilter.nf_conntrack_max = 1000000

# Required for eBPF-based services
net.ipv4.conf.all.rp_filter = 0
net.ipv4.conf.default.rp_filter = 0
EOF

# Apply the settings
sudo sysctl --system

# Verify the settings
sysctl net.ipv4.ip_forward net.core.bpf_jit_enable
```

Verify eBPF support:

```bash
# Check kernel version
uname -r

# Verify BPF filesystem is mounted
mount | grep bpf
# If not mounted:
sudo mount -t bpf bpf /sys/fs/bpf

# Make BPF mount persistent
echo "bpf /sys/fs/bpf bpf defaults 0 0" | sudo tee -a /etc/fstab

# Verify eBPF support in kernel
ls /sys/fs/bpf/
```

## Installing K3s Server with Cilium-Compatible Flags

```bash
# Install K3s server with all flags needed for Cilium
curl -sfL https://get.k3s.io | INSTALL_K3S_EXEC="\
  --flannel-backend=none \
  --disable-network-policy \
  --disable=traefik \
  --disable=servicelb \
  --cluster-cidr=10.42.0.0/16 \
  --service-cidr=10.43.0.0/16 \
  --write-kubeconfig-mode=0644 \
  --tls-san=$(hostname -I | awk '{print $1}')" sh -

# Explanation of flags:
# --flannel-backend=none     : Disables Flannel so Cilium can manage networking
# --disable-network-policy   : Disables K3s built-in network policy controller
# --disable=traefik          : Disables Traefik (optional, use Cilium Ingress instead)
# --disable=servicelb        : Disables K3s ServiceLB (optional, use Cilium LB)
# --cluster-cidr             : Pod CIDR that Cilium IPAM will manage
# --service-cidr             : Service CIDR for Kubernetes services
# --write-kubeconfig-mode    : Makes kubeconfig readable for Helm
# --tls-san                  : Adds the node IP as a valid API server address

# Configure kubeconfig access
export KUBECONFIG=/etc/rancher/k3s/k3s.yaml

# Verify K3s is running (node will be NotReady until Cilium is installed)
kubectl get nodes
```

## Configuring Cilium for the Master Node

Install Cilium with master-node-aware settings:

```yaml
# cilium-master-values.yaml
# Cilium Helm values optimized for K3s master node deployment
operator:
  replicas: 1
  # Tolerate master node taints so operator can run on master
  tolerations:
    - operator: Exists

# IPAM configuration matching K3s cluster-cidr
ipam:
  operator:
    clusterPoolIPv4PodCIDRList:
      - "10.42.0.0/16"

# K3s API server endpoint
k8sServiceHost: "127.0.0.1"
k8sServicePort: 6443

# Replace kube-proxy functionality
kubeProxyReplacement: true

# Socket-level load balancing for K3s services
socketLB:
  enabled: true

# BPF settings optimized for the master node
bpf:
  masquerade: true
  tproxy: true

# Health checking
healthChecking: true
healthPort: 9879

# Enable Hubble
hubble:
  enabled: true
  relay:
    enabled: true
```

```bash
# Install Cilium using the master-optimized values
helm repo add cilium https://helm.cilium.io/
helm repo update

helm install cilium cilium/cilium --version 1.16.5 \
  --namespace kube-system \
  -f cilium-master-values.yaml

# Wait for Cilium to be ready
kubectl rollout status daemonset/cilium -n kube-system --timeout=300s
kubectl rollout status deployment/cilium-operator -n kube-system --timeout=120s

# Verify node is now Ready
kubectl get nodes
```

## Configuring Resource Limits for the Master Node

Since the master runs both K3s control plane and Cilium, configure resource limits:

```bash
# Check current resource usage
kubectl top nodes 2>/dev/null || echo "Metrics server not yet available"

# Patch Cilium DaemonSet with resource limits appropriate for master
kubectl patch daemonset cilium -n kube-system --type='json' -p='[
  {"op": "replace", "path": "/spec/template/spec/containers/0/resources", "value": {
    "requests": {"cpu": "100m", "memory": "256Mi"},
    "limits": {"cpu": "2000m", "memory": "1Gi"}
  }}
]'
```

## Verification

Validate the master node is properly configured:

```bash
# Comprehensive master node validation
echo "=== Master Node Configuration Validation ==="

# 1. Kernel parameters
echo "1. Kernel Parameters:"
sysctl net.ipv4.ip_forward net.core.bpf_jit_enable 2>/dev/null

# 2. K3s server status
echo "2. K3s Server:"
sudo systemctl is-active k3s

# 3. Cilium status
echo "3. Cilium:"
cilium status 2>/dev/null || kubectl exec -n kube-system ds/cilium -- cilium status --brief

# 4. Node readiness
echo "4. Node:"
kubectl get nodes

# 5. Control plane pods
echo "5. Control Plane Pods:"
kubectl get pods -n kube-system -o custom-columns=NAME:.metadata.name,STATUS:.status.phase | head -15
```

## Troubleshooting

- **K3s server fails to start with Flannel disabled**: Check K3s logs with `journalctl -u k3s -f`. The server will start but the node will remain NotReady until Cilium is installed.
- **Cilium cannot reach the API server**: If `k8sServiceHost` is set to `127.0.0.1`, ensure the K3s API server is listening on localhost. Check with `ss -tlnp | grep 6443`.
- **BPF filesystem not mounted**: Run `mount -t bpf bpf /sys/fs/bpf` and add to `/etc/fstab` for persistence.
- **Master node under resource pressure**: The master runs both K3s control plane and Cilium. Monitor with `top` or `kubectl top nodes` and consider using a dedicated master node without workload scheduling.

## Conclusion

Configuring the K3s master node for Cilium requires kernel parameter tuning for eBPF, K3s server flags to disable conflicting components, Cilium Helm values that account for the master node's API server location, and resource limit configuration for shared-resource environments. Getting these settings right on the master node is essential because it serves as the foundation for the entire cluster's networking.
