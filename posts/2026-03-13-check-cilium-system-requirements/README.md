# Checking Cilium System Requirements

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Cilium, Kubernetes, Networking, eBPF

Description: A comprehensive guide to checking all system-level requirements for Cilium, including kernel version, BPF support, CPU architecture, and networking stack configuration.

---

## Introduction

Cilium's system requirements are more specific than most Kubernetes CNI plugins because of its deep integration with the Linux kernel via eBPF. Before installing Cilium in any environment - cloud-managed, self-managed, or bare metal - verifying the system requirements prevents failures that are difficult to diagnose after the fact. This guide provides a complete requirements checklist with the commands to verify each one.

The requirements fall into three categories: hard requirements (must be met or Cilium will not start), soft requirements (must be met for specific features), and recommended settings (improve performance and security but are not required for basic operation). Understanding which category each requirement falls into helps you prioritize what to fix first.

## Prerequisites

- Node access (SSH or `kubectl debug`)
- `kubectl` configured

## Hard Requirements

### Kernel Version

```bash
# Check kernel version

uname -r

# Minimum: 5.10+ or an equivalent distribution kernel (for example, 4.18 on RHEL 8.10)
# Feature requirements:
# - eBPF Host Routing: 5.10+ with kube-proxy replacement and BPF masquerading
# - XDP acceleration for NodePort/LoadBalancer/ExternalIP: 4.19.57+, 5.1.16+, or 5.2+
# - WireGuard: in-kernel WireGuard support (5.6+) or an out-of-tree module
# - eBPF Bandwidth Manager: CONFIG_NET_SCH_FQ; BBR for Pods requires 5.18+
# - IPv6 BIG TCP: 5.19+
# - IPv4 BIG TCP: 6.3+
# Recommended: 5.10+ or newer
```

### BPF Filesystem

```bash
# Check if BPF fs is mounted
mount | grep bpf
# Expected: bpffs on /sys/fs/bpf type bpf

# If not mounted:
mount bpffs -t bpf /sys/fs/bpf

# Make persistent
echo 'bpffs /sys/fs/bpf bpf defaults 0 0' >> /etc/fstab
```

### Kernel BPF Features

```bash
# Check BPF syscall support
grep CONFIG_BPF_SYSCALL= /boot/config-$(uname -r)
# Expected: CONFIG_BPF_SYSCALL=y

# Check BPF JIT
grep CONFIG_BPF_JIT= /boot/config-$(uname -r)
# Expected: CONFIG_BPF_JIT=y

# Check core Cilium BPF kernel options
grep -E 'CONFIG_BPF=|CONFIG_BPF_EVENTS=|CONFIG_NET_CLS_BPF=|CONFIG_NET_CLS_ACT=|CONFIG_NET_SCH_INGRESS=|CONFIG_CGROUP_BPF=' /boot/config-$(uname -r)

# Enable BPF JIT if available (improves performance)
echo 1 | sudo tee /proc/sys/net/core/bpf_jit_enable
```

## Architecture Requirements

```bash
# Check CPU architecture
uname -m
# Supported: x86_64 (amd64), aarch64 (arm64)
# Not supported: i386, armv7

# Check architecture-specific features
lscpu | grep -E "Architecture|CPU op-mode|Virtualization"
```

## Network Stack Requirements

```bash
# Check if TC (traffic control) is available
which tc || apt-get install -y iproute2

# Check tc filter support
tc filter help 2>&1 | grep -i bpf
# Expected: tc filter with eBPF support

# Check if eBPF-based classifiers are supported
modinfo cls_bpf 2>/dev/null || echo "cls_bpf module not available (may be built-in)"

# Check iproute2 version (tc)
ip -V
# Expected: a modern iproute2 build with tc support
```

## Soft Requirements by Feature

```bash
# WireGuard encryption requires:
modinfo wireguard 2>/dev/null || echo "WireGuard module not available"
uname -r  # Requires in-kernel WireGuard support on 5.6+ or an out-of-tree module

# IPsec encryption requires:
ip xfrm state list 2>/dev/null || echo "IPsec (xfrm) not available"

# Bandwidth Manager requires:
modinfo sch_fq 2>/dev/null || echo "sch_fq module not available (may be built-in)"
uname -r  # BBR for Pods requires 5.18+

# BPF host routing requires:
uname -r  # Requires 5.10+ plus kube-proxy replacement and BPF masquerading
```

## Container Runtime Requirements

```bash
# Check container runtime
kubectl get nodes -o jsonpath='{range .items[*]}{.metadata.name}{"\t"}{.status.nodeInfo.containerRuntimeVersion}{"\n"}{end}'

# Use a Kubernetes-supported CRI runtime:
# - containerd
# - CRI-O
# - Docker Engine only through cri-dockerd on Kubernetes 1.24+

# Check containerd version
containerd --version || docker version
```

## Complete Requirements Checklist

```bash
#!/bin/bash
# check-cilium-requirements.sh
PASS=0; FAIL=0

check() {
  local desc="$1"; local cmd="$2"; local expected="$3"
  if eval "$cmd" | grep -q "$expected" 2>/dev/null; then
    echo "PASS: $desc"; PASS=$((PASS+1))
  else
    echo "FAIL: $desc"; FAIL=$((FAIL+1))
  fi
}

check "Kernel >= 5.10 or RHEL 8.10 equivalent" "uname -r | awk -F'[.-]' '{if(\$1>5 || (\$1==5 && \$2>=10) || (\$1==4 && \$2==18 && \$0 ~ /el8_10/)) print \"ok\"}'" "ok"
check "BPF fs mounted" "mount | grep /sys/fs/bpf" "bpf"
check "BPF syscall enabled" "grep CONFIG_BPF_SYSCALL /boot/config-\$(uname -r)" "=y"
check "Architecture supported" "uname -m" "x86_64\|aarch64"

echo ""
echo "Results: $PASS passed, $FAIL failed"
```

## Conclusion

System requirements for Cilium are well-documented and can be verified with standard Linux commands. The most common blocker is kernel version - ensure your nodes are running 5.10+ or an equivalent distribution kernel for current Cilium releases. BPF filesystem mounting and the availability of BPF syscalls are the other critical prerequisites. Once these hard requirements are met, specific features like WireGuard, bandwidth management, and BPF host routing have their own kernel version gates that are easy to verify.
