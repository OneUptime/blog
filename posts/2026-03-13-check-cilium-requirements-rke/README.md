# Check Cilium Requirements on RKE (Rancher Kubernetes Engine)

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Cilium, Kubernetes, RKE, Rancher, EBPF

Description: Learn how to verify that your RKE or RKE2 cluster meets all the prerequisites for installing Cilium as the CNI, including node OS requirements, existing CNI removal, and RKE-specific configuration.

---

## Introduction

Rancher Kubernetes Engine (RKE and RKE2) supports custom CNI plugins, but installing Cilium requires specific configuration in your cluster configuration file and careful removal of the default CNI if the cluster was previously configured with Canal or Flannel. RKE2 natively supports Cilium as a CNI option, making it the recommended path for new Cilium installations on Rancher-managed clusters.

This guide covers prerequisites verification for both RKE (v1) and RKE2, including node OS compatibility, cluster configuration requirements, and pre-installation validation.

## Prerequisites

- RKE or RKE2 cluster (or plan to create one)
- `kubectl` with cluster admin access
- `cilium` CLI v1.14+
- SSH access to cluster nodes (for kernel verification)
- `rke` or `rke2` CLI

## Step 1: Verify Node OS and Kernel Requirements

Cilium requires a minimum kernel version. RKE supports multiple OS distributions.

```bash
# Check kernel version on all cluster nodes
kubectl get nodes -o jsonpath='{range .items[*]}{.metadata.name}{"\t"}{.status.nodeInfo.kernelVersion}{"\n"}{end}'

# Minimum kernel requirements:
# - Basic CNI: 4.9.17+
# - kube-proxy replacement: 4.19.57+
# - eBPF host routing: 5.10+
# - WireGuard encryption: 5.6+
# Recommended for production: 5.10+

# Check OS image on nodes
kubectl get nodes -o jsonpath='{range .items[*]}{.metadata.name}{"\t"}{.status.nodeInfo.osImage}{"\n"}{end}'

# Best supported OS for Cilium on RKE:
# Ubuntu 22.04 (kernel 5.15)
# SUSE Linux Enterprise 15 SP4+ (kernel 5.14+)
# openSUSE Leap 15.4+
```

## Step 2: Check RKE2 Native Cilium Support

RKE2 supports Cilium as a first-class CNI option since RKE2 v1.21+.

```bash
# Check RKE2 version
rke2 --version 2>/dev/null || kubectl get nodes -o jsonpath='{.items[0].status.nodeInfo.kubeletVersion}'

# For new RKE2 clusters, configure Cilium in the RKE2 config
# Create/edit /etc/rancher/rke2/config.yaml on server nodes:
cat << 'EOF'
# /etc/rancher/rke2/config.yaml for RKE2 with Cilium
cni: cilium                    # Tell RKE2 to use Cilium as CNI
disable-kube-proxy: true       # Cilium replaces kube-proxy when enabled
EOF

# Check current CNI configuration for existing RKE2 cluster
cat /etc/rancher/rke2/config.yaml | grep cni
```

## Step 3: Check RKE (v1) Configuration for Cilium

For RKE v1 clusters, configure the `cluster.yml` for Cilium.

```yaml
# cluster.yml for RKE v1 with custom CNI (none = BYOCNI for Cilium)
# Save and run: rke up --config cluster.yml

# Example RKE cluster.yml excerpt
network:
  plugin: none                   # Use none to install Cilium separately

# Note: With plugin: none, RKE will not install any CNI
# You must install Cilium separately after rke up completes

kubernetes_version: "1.29.0-rancher1-1"
nodes:
  - address: 10.0.1.10
    user: ubuntu
    roles: [controlplane, worker, etcd]
```

```bash
# Check current RKE cluster configuration
cat cluster.yml | grep -A5 "network:"

# Verify current CNI plugin running on the cluster
kubectl get pods -n kube-system | grep -E "calico|canal|flannel|cilium"
```

## Step 4: Verify No Conflicting CNI Components

Before installing Cilium, ensure no other CNI is running.

```bash
# Check for existing CNI pods
kubectl get pods -n kube-system | grep -E "calico|canal|flannel|weave|cilium"

# Check for CNI configuration files on nodes
# SSH to a node and check:
ls /etc/cni/net.d/
# For BYOCNI, this directory should be empty or contain only Cilium config after installation

# Check for leftover CNI binaries
ls /opt/cni/bin/
# Existing binaries (calico, flannel) should be removed if you're fully replacing the CNI
```

## Step 5: Run Pre-Installation Cilium Check

Before installing Cilium on RKE, run the requirements verification.

```bash
# Get cluster credentials (RKE2)
export KUBECONFIG=/etc/rancher/rke2/rke2.yaml

# Or for RKE v1
export KUBECONFIG=kube_config_cluster.yml

# Run Cilium's built-in pre-installation check
cilium install --dry-run \
  --helm-set kubeProxyReplacement=true \
  --helm-set k8sServiceHost=10.0.1.10 \
  --helm-set k8sServicePort=6443

# Check if nodes can communicate on required Cilium ports
# VXLAN: UDP 8472
# Cilium health: TCP 4240
# Hubble: TCP 4244
# Test from one node to another:
nc -zv <node-ip> 4240 && echo "Port 4240 OK"
```

## Best Practices

- Use RKE2 with `cni: cilium` for the simplest and most integrated Cilium installation.
- For RKE v1, use `plugin: none` and install Cilium via Helm after cluster creation.
- Use Ubuntu 22.04 or SUSE Linux Enterprise nodes for the best Cilium kernel feature support.
- Remove all existing CNI configuration files from `/etc/cni/net.d/` before installing Cilium.
- Always check that all cluster nodes are in `Ready` state before starting CNI migration.

## Conclusion

Cilium on RKE/RKE2 is well-supported, especially with RKE2's native `cni: cilium` option. By verifying node kernel versions, confirming no conflicting CNI is installed, and using the appropriate cluster configuration, you can install Cilium reliably on Rancher-managed clusters. RKE2's native integration is the preferred approach for new clusters.
