# Update Cilium Requirements on RKE

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: cilium, rke, rancher, kubernetes, requirements, cni, networking

Description: Learn how to verify and update Cilium's system requirements on Rancher Kubernetes Engine (RKE and RKE2), covering node OS compatibility, network configuration, and Rancher-specific prerequisites.

---

## Introduction

Rancher Kubernetes Engine (RKE and RKE2) has specific networking defaults and node provisioning behaviors that affect Cilium's requirements. RKE2 ships with Canal (Calico + Flannel) as its default CNI, while RKE1 uses Canal by default. Replacing these with Cilium requires understanding the CNI replacement process and ensuring all nodes meet Cilium's requirements before the switch.

RKE's node provisioning model — which manages Docker or containerd on worker nodes — affects how Cilium's eBPF programs are loaded. Additionally, Rancher's node hardening CIS profiles can restrict certain system calls that Cilium requires, making it essential to review these configurations before installation.

This guide covers checking and updating Cilium requirements specifically for RKE and RKE2 clusters, including CNI replacement planning, kernel verification, and Rancher-specific configuration adjustments.

## Prerequisites

- RKE or RKE2 cluster managed by Rancher
- `kubectl` with cluster-admin permissions
- `rke` or `rke2` CLI installed on provisioning nodes
- `cilium` CLI installed
- SSH access to cluster nodes (for RKE1)

## Step 1: Identify RKE Version and Current CNI

Determine whether you're running RKE1 or RKE2 and what CNI is currently in use.

```bash
# Check RKE2 version and status
rke2 --version

# Check current CNI from the cluster config
kubectl get configmap -n kube-system rke2-canal -o yaml 2>/dev/null || \
  echo "Canal not found — different CNI may be in use"

# Check which CNI pods are running
kubectl get pods -n kube-system | grep -E "canal|cilium|flannel|calico"

# View the CNI configuration on a node
# For RKE2: /etc/rancher/rke2/rke2.yaml contains cluster config
kubectl get node <node-name> -o jsonpath='{.metadata.annotations}'
```

## Step 2: Verify Node OS and Kernel Version

Check that all nodes meet Cilium's kernel requirements.

```bash
# Check all node kernel versions
kubectl get nodes \
  -o custom-columns="NODE:.metadata.name,KERNEL:.status.nodeInfo.kernelVersion,OS:.status.nodeInfo.osImage"

# For RKE2 nodes (commonly Ubuntu 22.04 or SLES 15)
# Ubuntu 22.04: kernel 5.15+ (full Cilium eBPF support)
# SLES 15 SP4: kernel 5.14+ (full Cilium eBPF support)
# CentOS Stream 8: kernel 4.18+ (basic Cilium support only)
```

Upgrade nodes that don't meet kernel requirements:

```bash
# On Ubuntu nodes — upgrade kernel to LTS version
sudo apt-get update && sudo apt-get install -y linux-image-generic-hwe-22.04
sudo reboot

# Verify kernel version after reboot
uname -r
```

## Step 3: Check RKE2 Network Configuration for Cilium Replacement

Plan the CNI replacement by reviewing RKE2's CNI configuration.

```bash
# View current RKE2 server configuration
cat /etc/rancher/rke2/config.yaml

# To replace Canal with Cilium, the RKE2 config needs:
# cni: cilium
# This requires cluster reprovisioning in RKE2
```

Create an updated RKE2 configuration for Cilium:

```yaml
# /etc/rancher/rke2/config.yaml — Updated for Cilium CNI
# This configuration disables Canal and prepares for Cilium
cni: cilium
cluster-cidr: 10.42.0.0/16
service-cidr: 10.43.0.0/16
# Disable kube-proxy if using Cilium's kube-proxy replacement
disable-kube-proxy: true
```

## Step 4: Check for CIS Hardening Profile Conflicts

Rancher's CIS hardening profiles may restrict system calls Cilium needs.

```bash
# Check if CIS hardening is enabled on the cluster
kubectl get configmap -n kube-system rke2-cis-benchmark-config 2>/dev/null

# Check sysctl settings on nodes that Cilium requires
sysctl net.ipv4.conf.all.rp_filter
sysctl net.ipv4.ip_forward
sysctl kernel.unprivileged_bpf_disabled

# Allow BPF syscalls if kernel.unprivileged_bpf_disabled is set to 1
# Cilium runs as privileged, so this should not be an issue
# But verify with:
echo 0 > /proc/sys/kernel/unprivileged_bpf_disabled
```

## Step 5: Validate Container Runtime Configuration

RKE2 uses containerd. Verify it's configured to support Cilium's CNI requirements.

```bash
# Check containerd version on RKE2 nodes
/var/lib/rancher/rke2/bin/containerd --version

# Verify CNI bin directory is accessible
ls /var/lib/rancher/rke2/data/current/bin/ | grep -E "cilium|cni"

# Check that CNI config directory is writable
ls -la /etc/cni/net.d/
```

## Best Practices

- Always test CNI replacement on a non-production RKE2 cluster first
- Back up the RKE cluster state before any CNI changes
- Plan for cluster downtime during CNI replacement in RKE1 (rolling replacement not supported)
- Use RKE2 over RKE1 for new clusters — better Cilium integration support
- Validate with `cilium connectivity test` after every requirement update

## Conclusion

Meeting Cilium's requirements on RKE and RKE2 involves verifying kernel compatibility, planning CNI replacement, and checking for CIS hardening profile conflicts. RKE2 provides the smoothest path for Cilium deployment through its native CNI plugin support. By carefully verifying each requirement layer before attempting the CNI switch, you avoid disrupting cluster networking during the transition.
