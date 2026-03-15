# Troubleshooting Errors in calicoctl node checksystem

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, Calicoctl, System Requirements, Troubleshooting, Kubernetes, Kernel

Description: Resolve errors reported by calicoctl node checksystem, including missing kernel modules, incorrect sysctl settings, and kernel version incompatibilities.

---

## Introduction

When `calicoctl node checksystem` reports errors, it means the host lacks critical requirements for Calico to function properly. These errors must be resolved before deployment, otherwise Calico may start but fail to enforce policies, route traffic, or maintain BGP sessions.

This guide addresses each category of error that checksystem can report and provides specific remediation steps for different Linux distributions.

## Prerequisites

- A Linux host with checksystem errors
- Root access
- Package manager access for installing kernel modules
- Knowledge of the target Calico features (VXLAN, IPIP, BGP)

## Kernel Version Errors

```yaml
ERROR: kernel version 3.10.0 is below minimum 5.10.0
```

Calico requires kernel 5.10+ for full functionality:

```bash
# Check current kernel version
uname -r

# On RHEL/CentOS, upgrade the kernel
sudo yum update kernel
sudo reboot

# On Ubuntu/Debian
sudo apt update && sudo apt upgrade linux-generic
sudo reboot
```

## Missing Kernel Module Errors

### iptables Modules

```yaml
ERROR: ip_tables - module not available
ERROR: iptable_filter - module not available
```

```bash
# Try loading the module
sudo modprobe ip_tables

# If modprobe fails, check if the module exists
find /lib/modules/$(uname -r) -name "ip_tables*"

# On Ubuntu/Debian, install extra modules
sudo apt install linux-modules-extra-$(uname -r)

# On RHEL/CentOS
sudo yum install kernel-modules-extra
```

### Conntrack Modules

```yaml
ERROR: nf_conntrack - module not loaded
```

```bash
# Load conntrack module
sudo modprobe nf_conntrack

# On older kernels, it may be named differently
sudo modprobe nf_conntrack_ipv4 2>/dev/null || sudo modprobe nf_conntrack
```

### IPVS Modules

```yaml
WARNING: ip_vs - module not loaded
```

```bash
# Load IPVS modules (needed for kube-proxy IPVS mode)
sudo modprobe ip_vs
sudo modprobe ip_vs_rr
sudo modprobe ip_vs_wrr
sudo modprobe ip_vs_sh

# Install ipvsadm utility
sudo apt install ipvsadm  # Debian/Ubuntu
sudo yum install ipvsadm  # RHEL/CentOS
```

## sysctl Parameter Errors

### IP Forwarding Disabled

```yaml
ERROR: net.ipv4.ip_forward = 0 (must be 1)
```

```bash
# Enable immediately
sudo sysctl -w net.ipv4.ip_forward=1

# Make persistent
echo "net.ipv4.ip_forward = 1" | sudo tee /etc/sysctl.d/99-calico.conf
sudo sysctl --system
```

### Reverse Path Filtering

```yaml
WARNING: net.ipv4.conf.all.rp_filter = 2 (recommended: 1)
```

```bash
sudo sysctl -w net.ipv4.conf.all.rp_filter=1
sudo sysctl -w net.ipv4.conf.default.rp_filter=1
echo "net.ipv4.conf.all.rp_filter = 1" | sudo tee -a /etc/sysctl.d/99-calico.conf
```

## Distribution-Specific Fixes

### Ubuntu / Debian

```bash
# Install all commonly needed modules
sudo apt update
sudo apt install -y linux-modules-extra-$(uname -r)

# Load all Calico-required modules
for mod in ip_tables iptable_filter iptable_nat iptable_mangle \
  ip_set xt_set xt_mark xt_multiport xt_conntrack nf_conntrack \
  vxlan ipip; do
  sudo modprobe "$mod" 2>/dev/null
done
```

### RHEL / CentOS / Rocky Linux

```bash
# Install kernel modules
sudo yum install -y kernel-modules-extra

# Load modules
for mod in ip_tables iptable_filter iptable_nat iptable_mangle \
  ip_set xt_set xt_mark xt_multiport xt_conntrack nf_conntrack \
  vxlan ipip; do
  sudo modprobe "$mod" 2>/dev/null
done
```

### Container-Optimized OS (Flatcar, Bottlerocket)

These minimal OS images may require different approaches:

```bash
# Flatcar Container Linux - modules are usually available but not loaded
# Check available modules
ls /lib/modules/$(uname -r)/kernel/net/

# Bottlerocket - kernel modules are managed by the OS
# Use bootstrap containers or user data to load modules
```

## Comprehensive Fix Script

```bash
#!/bin/bash
# fix-all-checksystem-errors.sh

echo "=== Fixing Calico System Requirements ==="

# 1. Load all required kernel modules
echo "Loading kernel modules..."
MODULES="ip_tables iptable_filter iptable_nat iptable_mangle ip_set xt_set xt_mark xt_multiport xt_conntrack nf_conntrack vxlan ipip"
for MOD in $MODULES; do
  if modprobe "$MOD" 2>/dev/null; then
    echo "  OK: $MOD"
  else
    echo "  FAIL: $MOD (may need kernel-modules-extra package)"
  fi
done

# 2. Persist module loading
echo "$MODULES" | tr ' ' '\n' > /etc/modules-load.d/calico.conf
echo "Module persistence configured."

# 3. Set sysctl parameters
cat > /etc/sysctl.d/99-calico.conf << 'EOF'
net.ipv4.ip_forward = 1
net.ipv6.conf.all.forwarding = 1
net.ipv4.conf.all.rp_filter = 1
net.ipv4.conf.default.rp_filter = 1
EOF
sysctl --system > /dev/null

echo "sysctl parameters configured."

# 4. Verify
echo ""
echo "=== Verification ==="
calicoctl node checksystem
```

## Verification

```bash
sudo ./fix-all-checksystem-errors.sh
sudo calicoctl node checksystem
```

All checks should pass after applying the fixes.

## Troubleshooting

- **Module loads but checksystem still shows error**: The module name may differ between kernel versions. Use `lsmod | grep <partial-name>` to find the actual module name.
- **Cannot install kernel-modules-extra**: You may need to enable additional package repositories or use a different kernel package.
- **sysctl changes revert after reboot**: Ensure the file is in `/etc/sysctl.d/` (not just `/etc/sysctl.conf`) and the systemd-sysctl service is enabled.

## Conclusion

Resolving `calicoctl node checksystem` errors is a required step before deploying Calico. By systematically loading kernel modules, setting sysctl parameters, and making these changes persistent, you create a host environment that fully supports Calico's networking and policy enforcement capabilities.
