# Validate Cilium Requirements for Generic Kubernetes

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: cilium, kubernetes, requirements, prerequisites, kubeadm, on-premises

Description: A universal guide to validating system requirements for running Cilium on any Kubernetes cluster, covering kernel requirements, system configuration, and Kubernetes API server settings.

---

## Introduction

Whether you are deploying Cilium on a bare metal cluster, a VM-based cluster built with kubeadm, or a specialized Kubernetes distribution, there is a core set of system requirements that must be met for Cilium to function correctly. These requirements span the Linux kernel, system configuration, network interface settings, and Kubernetes API server flags.

Unlike managed Kubernetes services that abstract infrastructure concerns, generic Kubernetes deployments give you full control—and full responsibility—for meeting these requirements. Understanding and validating each requirement before deploying Cilium prevents the trial-and-error debugging that often accompanies CNI failures.

This guide provides a comprehensive requirements checklist for generic Kubernetes deployments, applicable to kubeadm clusters, Cluster API, and any custom Kubernetes setup.

## Prerequisites

- Linux nodes (Ubuntu 20.04+, Debian 11+, RHEL 8+, or compatible)
- Kubernetes cluster deployed with kubeadm or equivalent
- Root or sudo access to nodes
- `kubectl` cluster-admin access

## Step 1: Validate Linux Kernel Version

Cilium requires specific kernel versions for different feature sets.

```bash
# Check kernel version on each node
kubectl get nodes -o jsonpath=\
'{range .items[*]}{.metadata.name}: {.status.nodeInfo.kernelVersion}{"\n"}{end}'

# Direct check on a node
uname -r

# Feature-based kernel requirements:
# Basic Cilium:              4.19+
# BPF NodePort:              5.4+
# kube-proxy replacement:    5.10+
# WireGuard encryption:      5.6+
# Bandwidth Manager:         5.1+
# Socket LB in all NS:       5.7+
```

## Step 2: Verify Required Kernel Modules and eBPF Support

```bash
# Check that eBPF filesystem is supported and mountable
mount | grep bpf || mount -t bpf bpf /sys/fs/bpf

# Verify required kernel config options are enabled
grep -E "CONFIG_BPF|CONFIG_BPF_SYSCALL|CONFIG_BPF_JIT" /boot/config-$(uname -r)

# Check that required modules are available
lsmod | grep -E "ip_tables|xt_socket|nf_conntrack"

# Verify tun module for VXLAN/Geneve support
modinfo vxlan 2>/dev/null && echo "VXLAN supported" || echo "VXLAN not available"
```

## Step 3: Check Kubernetes API Server Configuration

Cilium requires certain API server flags to be set.

```bash
# Check API server flags (on control plane node)
cat /etc/kubernetes/manifests/kube-apiserver.yaml | grep -E \
  "allow-privileged|service-cluster-ip-range|service-account-signing"

# Required flags:
# --allow-privileged=true (or use PodSecurityAdmission)
# --service-cluster-ip-range=<cidr>  (must not overlap with pod CIDR)

# Check kubeadm config for CIDR settings
kubectl -n kube-system get configmap kubeadm-config \
  -o jsonpath='{.data.ClusterConfiguration}' | grep -E "podSubnet|serviceSubnet"
```

## Step 4: Validate System Configuration

```bash
# Check that inotify limits are sufficient for Cilium's file watchers
sysctl fs.inotify.max_user_instances
sysctl fs.inotify.max_user_watches
# Recommended: max_user_instances >= 256, max_user_watches >= 65536

# Verify ulimits for open files
ulimit -n
# Should be at least 65536

# Check that ipv4 forwarding is enabled
sysctl net.ipv4.ip_forward
# Expected: net.ipv4.ip_forward = 1
```

## Step 5: Validate Network Interface Requirements

```bash
# Ensure nodes have a non-loopback network interface for Cilium to bind to
ip link show | grep -v "lo:" | grep "state UP"

# Check that the interface used for pod traffic does not have firewall rules
# blocking UDP 8472 (VXLAN) or UDP 6081 (Geneve) between nodes
iptables -L INPUT -n | grep -E "8472|6081"

# Confirm there are no conflicting CNI configurations in /etc/cni/net.d/
ls -la /etc/cni/net.d/
```

## Best Practices

- Validate requirements on every node type (control plane and worker) separately
- Use a requirements validation script in your node provisioning automation
- Set kernel parameters in `/etc/sysctl.d/` to persist across reboots
- Remove all other CNI config files from `/etc/cni/net.d/` before installing Cilium
- Document your node image/AMI version so requirements can be verified after updates

## Conclusion

Meeting Cilium's system requirements on generic Kubernetes is the foundation of a successful deployment. By validating kernel versions, system configuration, API server flags, and network interfaces before installation, you eliminate the most common causes of Cilium deployment failures and ensure all desired features are available from day one.
