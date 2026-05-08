# Validate Cilium Requirements for Generic Kubernetes

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Cilium, Kubernetes, Networking, eBPF

Description: A universal guide to validating system requirements for running Cilium on any Kubernetes cluster, covering kernel requirements, system configuration, and Kubernetes API server settings.

---

## Introduction

Whether you are deploying Cilium on a bare metal cluster, a VM-based cluster built with kubeadm, or a specialized Kubernetes distribution, there is a core set of system requirements that must be met for Cilium to function correctly. These requirements span the Linux kernel, system configuration, network interface settings, and Kubernetes API server flags.

Unlike managed Kubernetes services that abstract infrastructure concerns, generic Kubernetes deployments give you full control-and full responsibility-for meeting these requirements. Understanding and validating each requirement before deploying Cilium prevents the trial-and-error debugging that often accompanies CNI failures.

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

# Current Cilium releases recommend Linux kernel 5.10+,
# or an equivalent vendor kernel such as RHEL 8.10's 4.18 kernel.
#
# Advanced feature kernel requirements:
# Multicast support (AMD64): 5.10+
# IPv6 BIG TCP support:      5.19+
# Multicast support (AArch64): 6.0+
# IPv4 BIG TCP support:      6.3+
```

## Step 2: Verify Required Kernel Modules and eBPF Support

```bash
# Check that eBPF filesystem is supported and mountable
mount | grep bpf || mount -t bpf bpf /sys/fs/bpf

# Verify required kernel config options are enabled
grep -E "CONFIG_BPF=|CONFIG_BPF_EVENTS|CONFIG_BPF_SYSCALL|CONFIG_NET_CLS_BPF|CONFIG_BPF_JIT|CONFIG_NET_CLS_ACT|CONFIG_NET_SCH_INGRESS|CONFIG_CRYPTO_SHA1|CONFIG_CRYPTO_USER_API_HASH|CONFIG_CGROUPS|CONFIG_CGROUP_BPF|CONFIG_PERF_EVENTS|CONFIG_SCHEDSTATS" /boot/config-$(uname -r)

# Check optional netfilter modules used by some Cilium features
lsmod | grep -E "ip_tables|xt_socket|nf_conntrack|ip_set"

# Verify tunnel modules for VXLAN/Geneve support
modinfo vxlan 2>/dev/null && echo "VXLAN supported" || echo "VXLAN not available"
modinfo geneve 2>/dev/null && echo "Geneve supported" || echo "Geneve not available"
```

## Step 3: Check Kubernetes API Server Configuration

Cilium requires Kubernetes to be configured for CNI. Automatic node CIDR allocation is recommended for Kubernetes host-scope IPAM, and the service CIDR must not overlap with node or pod CIDRs.

```bash
# Check API server flags (on control plane node)
cat /etc/kubernetes/manifests/kube-apiserver.yaml | grep -E \
  "service-cluster-ip-range"

# Required API server setting:
# --service-cluster-ip-range=<cidr>
# The service CIDR must not overlap with node or pod CIDRs.

# Check whether kube-controller-manager allocates per-node PodCIDRs
cat /etc/kubernetes/manifests/kube-controller-manager.yaml | grep -E \
  "allocate-node-cidrs|cluster-cidr"

# Check kubeadm config for CIDR settings
kubectl -n kube-system get configmap kubeadm-config \
  -o jsonpath='{.data.ClusterConfiguration}' | grep -E "podSubnet|serviceSubnet"
```

## Step 4: Validate System Configuration

```bash
# Check host inotify limits for general Kubernetes node health
sysctl fs.inotify.max_user_instances
sysctl fs.inotify.max_user_watches
# Higher values may be needed on busy nodes with many pods

# Verify shell open-file limit for the current session
ulimit -n
# Raise this through systemd or your node image if node agents hit file limits

# Check ipv4 forwarding. Cilium enables forwarding for native routing,
# but this should not be disabled by node hardening automation.
sysctl net.ipv4.ip_forward
```

## Step 5: Validate Network Interface Requirements

```bash
# Ensure nodes have a non-loopback network interface for Cilium to bind to
ip link show | grep -v "lo:" | grep "state UP"

# Check firewall rules for ports Cilium may require:
# UDP 8472 (VXLAN), UDP 6081 (Geneve), UDP 51871 (WireGuard),
# and TCP 4240/ICMP for cilium-health.
iptables -S | grep -E "8472|6081|51871|4240" || true

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
