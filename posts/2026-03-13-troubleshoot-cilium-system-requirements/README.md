# Troubleshoot Cilium System Requirements

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Cilium, Kubernetes, Networking, EBPF

Description: A complete guide to verifying all system-level requirements for Cilium, including kernel versions, CPU architecture, memory, and filesystem prerequisites.

---

## Introduction

Cilium's advanced networking capabilities are built on Linux eBPF, which has specific kernel version and configuration requirements that vary by feature set. Before investing time in installing and configuring Cilium, validating that your nodes meet all system requirements prevents cryptic failures after deployment.

The system requirements for Cilium span multiple dimensions: kernel version, kernel configuration options, available memory for BPF maps, CPU architecture support, and filesystem mount points. Nodes that partially meet requirements may allow Cilium to start but disable certain features silently, leading to unexpected behavior in production.

This guide provides a comprehensive checklist and diagnostic commands to confirm your nodes are fully prepared for Cilium.

## Prerequisites

- SSH or `kubectl exec` access to cluster nodes
- Root or sudo permissions on nodes
- `cilium` CLI installed locally

## Step 1: Verify Minimum Kernel Version Requirements

Different Cilium features require different minimum kernel versions. This table outlines the key thresholds:

| Feature | Minimum Kernel |
|---|---|
| Basic CNI | 4.9.17 |
| Host Firewall | 5.3 |
| WireGuard Encryption | 5.6 |
| BandwidthManager | 5.1 |
| kube-proxy replacement | 5.10 (recommended) |

Run a kernel version check on all nodes:

```bash
# Check kernel version on all nodes in one command
kubectl get nodes -o jsonpath='{range .items[*]}{.metadata.name}{"\t"}{.status.nodeInfo.kernelVersion}{"\n"}{end}'

# On the node itself, get the full kernel config availability
uname -r && ls /boot/config-$(uname -r)
```

## Step 2: Validate Kernel Configuration Options

Cilium requires specific kernel config options to be enabled. These are typically compiled into the kernel on modern distributions but may be missing on custom-built kernels.

Check kernel configuration for required options:

```bash
# Read the kernel config (location varies by distro)
KERNEL_CONFIG=/boot/config-$(uname -r)
if [ ! -f "$KERNEL_CONFIG" ]; then
  KERNEL_CONFIG=/proc/config.gz
fi

# Check for critical eBPF and networking options
for option in CONFIG_BPF CONFIG_BPF_SYSCALL CONFIG_NET_CLS_BPF CONFIG_NET_ACT_BPF \
              CONFIG_BPF_JIT CONFIG_HAVE_EBPF_JIT CONFIG_NET_SCH_INGRESS \
              CONFIG_NETFILTER_XT_MATCH_MARK CONFIG_NETFILTER_XT_MARK; do
  if zcat "$KERNEL_CONFIG" 2>/dev/null | grep -q "^${option}=y" || \
     grep -q "^${option}=y" "$KERNEL_CONFIG" 2>/dev/null; then
    echo "${option}: ENABLED"
  else
    echo "${option}: MISSING"
  fi
done
```

## Step 3: Check Available Memory for BPF Maps

Cilium allocates BPF maps in kernel memory (locked memory). Nodes with `RLIMIT_MEMLOCK` set too low will fail to load BPF programs.

Verify and adjust memory limits:

```bash
# Check the current memlock limit (both soft and hard)
ulimit -l

# Check system-wide locked memory usage
cat /proc/meminfo | grep Mlocked

# For systems with low limits, increase the memlock limit for the cilium process
# Add to /etc/security/limits.conf:
echo "* soft memlock unlimited" >> /etc/security/limits.conf
echo "* hard memlock unlimited" >> /etc/security/limits.conf
```

## Step 4: Confirm Filesystem and Mount Requirements

Cilium requires the BPF filesystem and debugfs to be mounted correctly. These are often missing on minimal server installations.

Validate and fix filesystem mounts:

```bash
# Check that BPF filesystem is mounted
mount | grep bpf || echo "BPF filesystem NOT mounted"

# Check for debugfs (required for some Cilium diagnostic features)
mount | grep debugfs || echo "debugfs NOT mounted"

# Persistently mount the BPF filesystem via systemd
cat > /etc/systemd/system/sys-fs-bpf.mount << 'EOF'
[Unit]
Description=BPF mounts
DefaultDependencies=no
Before=local-fs.target umount.target
After=swap.target

[Mount]
What=bpffs
Where=/sys/fs/bpf
Type=bpf
Options=rw,nosuid,nodev,noexec,relatime,mode=700

[Install]
WantedBy=multi-user.target
EOF

systemctl enable --now sys-fs-bpf.mount
```

## Best Practices

- Use `cilium install --dry-run` to validate Helm values before actual installation
- Prefer distribution kernels over custom-compiled kernels for Cilium deployments
- Allocate at least 2 GiB of RAM per node for Cilium's BPF maps on clusters with many endpoints
- Document the exact kernel version and configuration for each node type in your runbook
- Run `cilium-dbg` (Cilium's debug tool) during initial setup to capture the full system state

## Conclusion

Meeting Cilium's system requirements is the foundation of a stable deployment. By validating kernel versions, config options, memory limits, and filesystem mounts before installation, you avoid the most common categories of Cilium failures. A thorough pre-flight check takes minutes and prevents hours of post-deployment troubleshooting.
