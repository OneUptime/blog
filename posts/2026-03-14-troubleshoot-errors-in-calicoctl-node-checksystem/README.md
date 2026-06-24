# Troubleshooting Errors in calicoctl node checksystem

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, Calicoctl, System Requirements, Troubleshooting, Kubernetes, Kernel

Description: Resolve errors reported by calicoctl node checksystem, including missing kernel modules, incorrect sysctl settings, and kernel version incompatibilities.

---

## Introduction

When `calicoctl node checksystem` reports errors, it means the host lacks kernel compatibility or kernel module requirements for Calico to function properly. These errors must be resolved before deployment, otherwise Calico may start but fail to enforce policies, route traffic, or maintain BGP sessions.

This guide addresses the categories of error that checksystem can report and provides specific remediation steps for different Linux distributions. It also includes related sysctl settings that are commonly checked during Calico node preparation.

## Prerequisites

- A Linux host with checksystem errors
- Root access
- Package manager access for installing kernel modules
- Knowledge of the target Calico features (VXLAN, IPIP, BGP)

## Kernel Version Errors

```yaml
2.6.18                                                  FAIL
Minimum kernel version to run Calico is 2.6.24. Detected kernel version: 2.6.18
```

`calicoctl node checksystem` checks against its built-in minimum kernel version. Current Calico node requirements are stricter: Calico requires Linux kernel 5.10 or later with the required dependencies.

```bash
# Check current kernel version

uname -r

# On RHEL/CentOS, upgrade the kernel
sudo yum update kernel
sudo reboot

# On Ubuntu
sudo apt update && sudo apt install --only-upgrade linux-generic

# On Debian, install or upgrade the appropriate linux-image-* package
sudo reboot
```

## Missing Kernel Module Errors

### iptables Modules

```yaml
WARNING: Unable to detect the ip_tables module as Loaded/Builtin module or lsmod
ip_tables                                               FAIL
```

```bash
# Try loading the module
sudo modprobe ip_tables

# If modprobe fails, check if the module exists
find /lib/modules/$(uname -r) -name "ip_tables*"

# On Ubuntu, install extra modules
sudo apt install linux-modules-extra-$(uname -r)

# On RHEL/CentOS
sudo yum install kernel-modules-extra
```

### Conntrack Modules

```yaml
WARNING: Unable to detect the xt_conntrack module as Loaded/Builtin module or lsmod
xt_conntrack                                            FAIL
```

```bash
# Load conntrack-related modules checked by calicoctl
sudo modprobe xt_conntrack
sudo modprobe nf_conntrack_netlink

# On older kernels, it may be named differently
sudo modprobe nf_conntrack_ipv4 2>/dev/null || sudo modprobe nf_conntrack
```

### IPVS Modules

```yaml
WARNING: Unable to detect the ipt_ipvs module as Loaded/Builtin module or lsmod
ipt_ipvs                                                FAIL
```

```bash
# Load IPVS modules (needed for kube-proxy IPVS mode)
sudo modprobe ipt_ipvs 2>/dev/null || sudo modprobe xt_ipvs
sudo modprobe ip_vs
sudo modprobe ip_vs_rr
sudo modprobe ip_vs_wrr
sudo modprobe ip_vs_sh

# Install ipvsadm utility
sudo apt install ipvsadm  # Debian/Ubuntu
sudo yum install ipvsadm  # RHEL/CentOS
```

## Related sysctl Settings

### IP Forwarding Disabled

```yaml
net.ipv4.ip_forward = 0
```

`calicoctl node checksystem` does not validate sysctl settings. However, Calico node startup enables IPv4 forwarding, and many node provisioning checks require it to be set persistently:

```bash
# Enable immediately
sudo sysctl -w net.ipv4.ip_forward=1

# Make persistent
echo "net.ipv4.ip_forward = 1" | sudo tee /etc/sysctl.d/99-calico.conf
sudo sysctl --system
```

### Reverse Path Filtering

```yaml
net.ipv4.conf.all.rp_filter = 1
```

Linux reverse path filtering uses `0` for disabled, `1` for strict mode, and `2` for loose mode. If you are troubleshooting asymmetric routing or tunneled traffic drops, disable strict RPF for the Calico node interfaces:

```bash
sudo sysctl -w net.ipv4.conf.all.rp_filter=0
sudo sysctl -w net.ipv4.conf.default.rp_filter=0
echo "net.ipv4.conf.all.rp_filter = 0" | sudo tee -a /etc/sysctl.d/99-calico.conf
echo "net.ipv4.conf.default.rp_filter = 0" | sudo tee -a /etc/sysctl.d/99-calico.conf
```

## Distribution-Specific Fixes

### Ubuntu / Debian

```bash
# Install commonly needed modules on Ubuntu generic kernels
sudo apt update
sudo apt install -y linux-modules-extra-$(uname -r)

# Load commonly required modules
for mod in ip_tables ip6_tables ip_set xt_set xt_mark xt_multiport \
  xt_conntrack nf_conntrack_netlink xt_addrtype xt_u32 xt_bpf \
  ipt_REJECT ipt_rpfilter ipt_ipvs vxlan ipip; do
  sudo modprobe "$mod" 2>/dev/null
done
```

### RHEL / CentOS / Rocky Linux

```bash
# Install kernel modules
sudo yum install -y kernel-modules-extra

# Load commonly required modules
for mod in ip_tables ip6_tables ip_set xt_set xt_mark xt_multiport \
  xt_conntrack nf_conntrack_netlink xt_addrtype xt_u32 xt_bpf \
  ipt_REJECT ipt_rpfilter ipt_ipvs vxlan ipip; do
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
MODULES="ip_tables ip6_tables ip_set xt_set xt_mark xt_multiport xt_conntrack nf_conntrack_netlink xt_addrtype xt_u32 xt_bpf ipt_REJECT ipt_rpfilter ipt_ipvs vxlan ipip"
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
net.ipv4.conf.all.rp_filter = 0
net.ipv4.conf.default.rp_filter = 0
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

- **Module loads but checksystem still shows error**: The module name may differ between kernel versions or be provided under an alias. Use `lsmod | grep <partial-name>` and `modinfo <module>` to find the actual module name and aliases.
- **Cannot install kernel-modules-extra**: You may need to enable additional package repositories or use a different kernel package.
- **sysctl changes revert after reboot**: Ensure the file is in `/etc/sysctl.d/` (not just `/etc/sysctl.conf`) and the systemd-sysctl service is enabled.

## Conclusion

Resolving `calicoctl node checksystem` errors is a required step before deploying Calico. By systematically loading kernel modules, setting sysctl parameters, and making these changes persistent, you create a host environment that fully supports Calico's networking and policy enforcement capabilities.
