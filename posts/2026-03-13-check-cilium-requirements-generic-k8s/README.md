# Checking Cilium Requirements for Generic Kubernetes

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Cilium, Kubernetes, Networking, eBPF

Description: A comprehensive guide to checking all Cilium requirements on a generic Kubernetes cluster (kubeadm, k3s, or bare metal), covering kernel, BPF, and networking prerequisites.

---

## Introduction

Installing Cilium on a generic Kubernetes cluster - one created with kubeadm, k3s, or directly on bare metal - requires checking a broader set of prerequisites than managed cloud clusters. Without the managed node image standardization of EKS or AKS, you have more control but also more responsibility. Kernel versions, BPF filesystem mount, iptables/nftables configuration, and IPAM planning all require explicit verification.

This guide covers every requirement check for generic Kubernetes deployments. It is applicable to kubeadm-initialized clusters, k3s clusters, RKE2 installations, and bare metal Kubernetes. The checks are organized from most likely to cause installation failure (kernel version, BPF mount) to less common but important prerequisites (IPAM CIDR planning, kube-proxy configuration for replacement mode).

## Prerequisites

- Kubernetes cluster running (kubeadm, k3s, or similar)
- `kubectl` configured with cluster-admin access
- SSH access to nodes (for kernel-level checks)

## Step 1: Kernel Version Check

```bash
# Check kernel version on all nodes
kubectl get nodes -o jsonpath='{range .items[*]}{.metadata.name}{"\t"}{.status.nodeInfo.kernelVersion}{"\n"}{end}'

# SSH to a node and check in detail
uname -a
uname -r

# Minimum requirements:
# Cilium core: 4.9.17
# Recommended: 5.10+
# Full feature set (BPF host routing, WireGuard): 5.15+

# Check available kernel features
zcat /proc/config.gz | grep -E "CONFIG_BPF=|CONFIG_BPF_SYSCALL=|CONFIG_NET_CLS_BPF=|CONFIG_NET_ACT_BPF="
```

## Step 2: BPF Filesystem Check

```bash
# Check if BPF filesystem is mounted
mount | grep bpf
# Expected: bpffs on /sys/fs/bpf type bpf (rw,nosuid,nodev,noexec,relatime)

# If not mounted, add to /etc/fstab
echo 'none /sys/fs/bpf bpf rw,nosuid,nodev,noexec,relatime 0 0' | sudo tee -a /etc/fstab
sudo mount /sys/fs/bpf

# Verify mount
mount | grep bpf
```

## Step 3: CNI Directory Check

```bash
# Check CNI directory exists
ls -la /etc/cni/net.d/
ls -la /opt/cni/bin/

# Check if another CNI is already installed
ls /etc/cni/net.d/
# If other CNI configs exist, they must be removed before Cilium installation

# Remove old CNI config (replace with Cilium)
sudo rm /etc/cni/net.d/*.conflist
sudo rm /etc/cni/net.d/*.conf
```

## Step 4: kube-proxy Configuration

```bash
# Check kube-proxy mode
kubectl get configmap -n kube-system kube-proxy -o yaml | grep mode
# Options: iptables, ipvs, nftables

# For kube-proxy replacement mode, check kube-proxy is running
kubectl get pods -n kube-system -l k8s-app=kube-proxy

# If using strict kube-proxy replacement, kube-proxy must be removed
kubectl delete daemonset -n kube-system kube-proxy
```

## Step 5: Pod CIDR Planning

```bash
# Check current cluster CIDR
kubectl cluster-info dump | grep -m1 "cluster-cidr"

# Or check kubeadm config
kubectl get configmap -n kube-system kubeadm-config -o yaml | grep podSubnet

# Ensure CIDR is not overlapping with:
# - Node CIDRs (host networks)
# - Service CIDR
# - Any other network ranges in use

# Check node IPs
kubectl get nodes -o wide | awk '{print $6, $7}'
```

## Step 6: Network Requirements

```bash
# Check if required ports are open between nodes
# From each node, test connectivity to each other node
NODE_IPS=$(kubectl get nodes -o jsonpath='{.items[*].status.addresses[?(@.type=="InternalIP")].address}')

for ip in $NODE_IPS; do
  # Test VXLAN port (Cilium overlay mode)
  nc -zu $ip 8472 && echo "$ip: UDP 8472 open" || echo "$ip: UDP 8472 blocked"
  # Test health check port
  nc -z $ip 4240 && echo "$ip: TCP 4240 open" || echo "$ip: TCP 4240 blocked"
done
```

## Requirements Checklist

- [ ] Kernel >= 4.9.17 (5.10+ recommended)
- [ ] BPF filesystem mounted at `/sys/fs/bpf`
- [ ] No conflicting CNI plugin installed
- [ ] Pod CIDR defined and non-overlapping
- [ ] Required ports open between nodes (UDP 8472, TCP 4240)
- [ ] Privileged containers allowed (for CNI installation)

## Conclusion

Generic Kubernetes installations give you the most flexibility for Cilium deployment but require the most explicit prerequisite verification. Checking kernel version, BPF filesystem availability, CNI conflicts, and network port accessibility before installation prevents the most common failure modes. With these checks passing, `cilium install` on a generic Kubernetes cluster is straightforward and reliable.
