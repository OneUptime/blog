# Checking Cilium Requirements for Generic Kubernetes

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Cilium, Kubernetes, Networking, eBPF

Description: A comprehensive guide to checking all Cilium requirements on a generic Kubernetes cluster (kubeadm, k3s, or bare metal), covering kernel, BPF, and networking prerequisites.

---

## Introduction

Installing Cilium on a generic Kubernetes cluster - one created with kubeadm, k3s, or directly on bare metal - requires checking a broader set of prerequisites than managed cloud clusters. Without the managed node image standardization of EKS or AKS, you have more control but also more responsibility. Kernel versions, BPF filesystem availability, iptables/nftables configuration, and IPAM planning all require explicit verification.

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
# Cilium current releases: 5.10+ or an equivalent distribution kernel
# (for example, 4.18 on RHEL 8.10)
# Some features have newer kernel requirements, such as BIG TCP on 6.8+

# Check available kernel features
CONFIG_FILE=/proc/config.gz
[ -r "$CONFIG_FILE" ] || CONFIG_FILE=/boot/config-$(uname -r)
if [ "$CONFIG_FILE" = "/proc/config.gz" ]; then
  zcat "$CONFIG_FILE"
else
  cat "$CONFIG_FILE"
fi | grep -E "CONFIG_BPF=|CONFIG_BPF_SYSCALL=|CONFIG_NET_CLS_BPF=|CONFIG_NET_ACT_BPF=|CONFIG_NET_CLS_ACT=|CONFIG_BPF_JIT="
```

## Step 2: BPF Filesystem Check

```bash
# Check if BPF filesystem is mounted
mount | grep bpf
# Expected: bpffs on /sys/fs/bpf type bpf (rw,nosuid,nodev,noexec,relatime)

# Cilium can mount bpffs automatically. To mount it persistently yourself,
# add the official fstab entry and mount it once.
echo 'bpffs /sys/fs/bpf bpf defaults 0 0' | sudo tee -a /etc/fstab
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
# If other CNI configs exist, remove them before a normal Cilium installation,
# unless you are intentionally using CNI chaining.

# Move old CNI config aside (replace with Cilium)
sudo mkdir -p /etc/cni/net.d/backup
sudo mv /etc/cni/net.d/*.conflist /etc/cni/net.d/*.conf /etc/cni/net.d/backup/ 2>/dev/null || true
```

## Step 4: kube-proxy Configuration

```bash
# Check kube-proxy mode
kubectl get configmap -n kube-system kube-proxy -o yaml | grep mode
# Common options: iptables, ipvs, nftables

# For the default Cilium mode, kube-proxy can remain running
kubectl get pods -n kube-system -l k8s-app=kube-proxy

# If using full kube-proxy replacement, remove kube-proxy before or during
# Cilium installation and clean up existing kube-proxy iptables rules.
kubectl -n kube-system delete daemonset kube-proxy
kubectl -n kube-system delete configmap kube-proxy
sudo iptables-save | grep -v KUBE | sudo iptables-restore
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

# Check node PodCIDRs and IPs
kubectl get nodes -o custom-columns=NAME:.metadata.name,PODCIDR:.spec.podCIDR,INTERNAL-IP:.status.addresses[?(@.type=="InternalIP")].address
```

## Step 6: Network Requirements

```bash
# Check if required ports are open between nodes
# From each node, test connectivity to each other node
NODE_IPS=$(kubectl get nodes -o jsonpath='{.items[*].status.addresses[?(@.type=="InternalIP")].address}')

for ip in $NODE_IPS; do
  # Test VXLAN port (Cilium overlay mode). UDP checks with nc can only
  # confirm that the packet was sent; validate firewall rules separately.
  nc -zvu $ip 8472 && echo "$ip: UDP 8472 reachable or no ICMP rejection" || echo "$ip: UDP 8472 blocked or rejected"
  # Test health check port (cilium-health)
  nc -z $ip 4240 && echo "$ip: TCP 4240 open" || echo "$ip: TCP 4240 blocked"
done
```

## Requirements Checklist

- [ ] Kernel >= 5.10 or equivalent distribution kernel (for example, RHEL 8.10 4.18)
- [ ] BPF filesystem mounted at `/sys/fs/bpf`, or Cilium allowed to mount it
- [ ] No conflicting CNI plugin installed, unless using CNI chaining
- [ ] Pod CIDR defined and non-overlapping
- [ ] Required ports open between nodes (UDP 8472, TCP 4240)
- [ ] Privileged containers allowed (for CNI installation)

## Conclusion

Generic Kubernetes installations give you the most flexibility for Cilium deployment but require the most explicit prerequisite verification. Checking kernel version, BPF filesystem availability, CNI conflicts, and network port accessibility before installation prevents the most common failure modes. With these checks passing, `cilium install` on a generic Kubernetes cluster is straightforward and reliable.
