# Troubleshoot Cilium Requirements on Generic Kubernetes Clusters

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Cilium, Kubernetes, Networking, eBPF

Description: A comprehensive guide to verifying system requirements for Cilium on generic Kubernetes clusters, covering kernel versions, mount points, and CNI prerequisites.

---

## Introduction

Installing Cilium on a generic (self-managed) Kubernetes cluster requires careful validation of the underlying system environment. Unlike managed cloud offerings, generic clusters can run on a wide variety of Linux distributions, kernel versions, and hardware configurations - each introducing unique compatibility challenges.

Cilium's eBPF-based dataplane relies on specific kernel features that must be available and properly configured. Missing kernel configuration options, incorrect mount points, or incompatible CNI configurations are the most common reasons for Cilium installation failures on generic clusters.

This guide provides a systematic checklist for validating requirements before and after Cilium installation, helping you identify gaps quickly and resolve them without trial-and-error.

## Prerequisites

- Root or sudo access to cluster nodes
- `kubectl` configured against your cluster
- `cilium` CLI installed on your workstation
- Linux kernel 5.10+ on all nodes, or a distribution-supported equivalent such as RHEL 8.10's 4.18 kernel

## Step 1: Validate Kernel Version and eBPF Support

Cilium depends on eBPF, which requires specific kernel capabilities. Run this check on each node to confirm compatibility.

SSH into each node and run the kernel validation:

```bash
# Check kernel version - must be 5.10 or higher, unless your distribution documents an equivalent backport

uname -r

# Verify eBPF filesystem is mounted
mount | grep /sys/fs/bpf

# If not mounted, Cilium can mount it automatically. To mount it before installation:
mount bpffs /sys/fs/bpf -t bpf -o rw,nosuid,nodev,noexec,relatime,mode=700
```

## Step 2: Check Required Kernel Configuration

Cilium requires several kernel configuration options to be available. Missing kernel capabilities cause agent startup or datapath failures that can be hard to diagnose without this check.

Verify the base eBPF kernel options, then check feature-specific options if you use tunneling, iptables-based masquerading, or L7/FQDN policies:

```bash
# Locate the kernel config exposed by your distribution
for config in /proc/config.gz /boot/config-$(uname -r); do
  if [ -r "$config" ]; then
    KERNEL_CONFIG="$config"
    break
  fi
done

if [ -z "$KERNEL_CONFIG" ]; then
  echo "Kernel config not found in /proc/config.gz or /boot/config-$(uname -r)"
  exit 1
fi

# Check base eBPF options required by Cilium
zgrep -E 'CONFIG_(BPF|BPF_EVENTS|BPF_SYSCALL|NET_CLS_BPF|BPF_JIT|NET_CLS_ACT|NET_SCH_INGRESS|CRYPTO_SHA1|CRYPTO_USER_API_HASH|CGROUPS|CGROUP_BPF|PERF_EVENTS|SCHEDSTATS)=' "$KERNEL_CONFIG"

# If you use the default VXLAN tunnel mode, also confirm tunneling and routing options
zgrep -E 'CONFIG_(VXLAN|GENEVE|FIB_RULES)=' "$KERNEL_CONFIG"

# If you use iptables-based masquerading, confirm the netfilter/ipset options
zgrep -E 'CONFIG_(NETFILTER_XT_SET|IP_SET|IP_SET_HASH_IP|NETFILTER_XT_MATCH_COMMENT)=' "$KERNEL_CONFIG"

# If you use L7 or FQDN policies, also confirm the TPROXY/socket match options
zgrep -E 'CONFIG_NETFILTER_XT_(TARGET_TPROXY|TARGET_MARK|TARGET_CT|MATCH_MARK|MATCH_SOCKET)=' "$KERNEL_CONFIG"
```

## Step 3: Validate CNI Directory and Configuration

Cilium installs its CNI configuration into `/etc/cni/net.d/`. By default, the Cilium DaemonSet writes `/etc/cni/net.d/05-cilium.conflist` and removes other CNI configuration files. If you disable that exclusive CNI management or are migrating from another CNI, conflicting configurations from previous installations can prevent Cilium from taking control of the network.

Clean up conflicting CNI configurations:

```bash
# List existing CNI configurations
ls -la /etc/cni/net.d/

# Remove configurations from any previous CNI (e.g., flannel, calico) before installing Cilium
# WARNING: This will disrupt existing pod networking - drain nodes first
sudo rm -f /etc/cni/net.d/10-flannel.conflist
sudo rm -f /etc/cni/net.d/calico.conflist

# Confirm the CNI binary directory exists and is writable
ls -la /opt/cni/bin/
```

## Step 4: Verify Cilium Agent Health After Installation

After installation, confirm the Cilium agent is running correctly on all nodes using the Cilium CLI.

Run a full status and connectivity check:

```bash
# Check Cilium agent status across all nodes
cilium status --wait

# Run the built-in connectivity test to validate pod-to-pod and pod-to-service traffic
cilium connectivity test

# Check individual agent logs for any startup errors
kubectl -n kube-system logs -l k8s-app=cilium --tail=50
```

## Best Practices

- Always drain and cordon a node before replacing its CNI to avoid traffic disruption
- Use a consistent Linux distribution across all nodes to avoid per-distro kernel feature differences
- Enable the BPF filesystem in systemd with a persistent mount unit rather than relying on manual mounts
- Pin the Cilium Helm chart version in CI to prevent accidental upgrades during testing
- Run `cilium connectivity test` after every node replacement or kernel upgrade

## Conclusion

Generic Kubernetes clusters require careful pre-installation validation for Cilium. By confirming kernel versions, eBPF filesystem mounts, kernel configuration, and CNI directory cleanliness, you eliminate the majority of installation failures before they occur. The Cilium CLI's status and connectivity tests then give you a clear signal that the environment is healthy and ready for production workloads.
