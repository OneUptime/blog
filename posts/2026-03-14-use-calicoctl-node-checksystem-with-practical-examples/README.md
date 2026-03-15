# Using calicoctl node checksystem with Practical Examples

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, Calicoctl, System Requirements, Kubernetes, Pre-flight Checks

Description: Use calicoctl node checksystem to verify that a host meets all kernel and system requirements for running Calico, with practical pre-deployment validation examples.

---

## Introduction

Before deploying Calico on a new node, you need to verify that the host's kernel and system configuration meet Calico's requirements. The `calicoctl node checksystem` command performs these pre-flight checks automatically, verifying kernel version, required kernel modules, network capabilities, and system parameters.

Running this check before deployment prevents frustrating post-deployment failures where Calico partially works but cannot enforce certain policy types or use specific encapsulation modes. It is especially important when deploying on custom-built OS images or minimal distributions that may not include all required kernel modules.

## Prerequisites

- A Linux host where Calico will be deployed
- `calicoctl` binary installed
- Root or sudo access
- Basic understanding of Linux kernel modules

## Basic Usage

```bash
sudo calicoctl node checksystem
```

Example output:

```text
Checking kernel version...
  OK: kernel version is 5.15.0
Checking kernel modules...
  OK: ip_tables
  OK: iptable_filter
  OK: iptable_nat
  OK: ip_set
  OK: xt_set
  OK: xt_mark
  OK: xt_multiport
  OK: xt_conntrack
  OK: nf_conntrack
  WARNING: ip_vs - module not loaded (required for kube-proxy IPVS mode)
Checking sysctl parameters...
  OK: net.ipv4.ip_forward = 1
  WARNING: net.ipv6.conf.all.forwarding = 0 (should be 1 for IPv6)
System check complete: 2 warnings, 0 errors
```

## Pre-Deployment Validation Script

```bash
#!/bin/bash
# pre-deploy-checksystem.sh
# Comprehensive pre-deployment validation

echo "=== Pre-Deployment System Check ==="
echo "Host: $(hostname)"
echo "Kernel: $(uname -r)"
echo "OS: $(cat /etc/os-release 2>/dev/null | grep PRETTY_NAME | cut -d= -f2 | tr -d '"')"
echo ""

# Run calicoctl checksystem
RESULT=$(sudo calicoctl node checksystem 2>&1)
echo "$RESULT"

# Count issues
ERRORS=$(echo "$RESULT" | grep -c "ERROR" || echo 0)
WARNINGS=$(echo "$RESULT" | grep -c "WARNING" || echo 0)

echo ""
echo "=== Summary ==="
echo "Errors: $ERRORS"
echo "Warnings: $WARNINGS"

if [ "$ERRORS" -gt 0 ]; then
  echo "RESULT: FAIL - fix errors before deploying Calico"
  exit 1
elif [ "$WARNINGS" -gt 0 ]; then
  echo "RESULT: PASS WITH WARNINGS - review warnings"
  exit 0
else
  echo "RESULT: PASS - system meets all Calico requirements"
  exit 0
fi
```

## Fixing Common Issues

### Loading Missing Kernel Modules

```bash
# Load required modules
sudo modprobe ip_tables
sudo modprobe iptable_filter
sudo modprobe iptable_nat
sudo modprobe iptable_mangle
sudo modprobe ip_set
sudo modprobe xt_set
sudo modprobe xt_mark
sudo modprobe xt_multiport
sudo modprobe xt_conntrack
sudo modprobe nf_conntrack
sudo modprobe vxlan  # For VXLAN encapsulation
sudo modprobe ipip   # For IP-in-IP encapsulation

# Make modules persist across reboots
cat > /etc/modules-load.d/calico.conf << 'EOF'
ip_tables
iptable_filter
iptable_nat
iptable_mangle
ip_set
xt_set
xt_mark
xt_multiport
xt_conntrack
nf_conntrack
vxlan
ipip
EOF
```

### Fixing sysctl Parameters

```bash
# Enable IP forwarding
cat > /etc/sysctl.d/99-calico.conf << 'EOF'
net.ipv4.ip_forward = 1
net.ipv6.conf.all.forwarding = 1
net.ipv4.conf.all.rp_filter = 1
net.ipv4.conf.default.rp_filter = 1
EOF

# Apply immediately
sudo sysctl --system
```

## Fleet-Wide System Check

```bash
#!/bin/bash
# fleet-checksystem.sh
# Runs checksystem on all target hosts

HOSTS_FILE="${1:-hosts.txt}"
FAILURES=0

while IFS= read -r HOST; do
  echo "=== $HOST ==="
  ssh "$HOST" "sudo calicoctl node checksystem 2>&1" || true
  
  ERRORS=$(ssh "$HOST" "sudo calicoctl node checksystem 2>&1 | grep -c ERROR" 2>/dev/null || echo 0)
  if [ "$ERRORS" -gt 0 ]; then
    FAILURES=$((FAILURES + 1))
  fi
  echo ""
done < "$HOSTS_FILE"

echo "=== Fleet Summary ==="
echo "Hosts with errors: $FAILURES"
exit $FAILURES
```

## Automated Remediation

```bash
#!/bin/bash
# fix-system-requirements.sh
# Automatically fixes common system requirement issues

echo "Fixing Calico system requirements..."

# Load kernel modules
MODULES="ip_tables iptable_filter iptable_nat ip_set xt_set xt_mark xt_multiport xt_conntrack nf_conntrack vxlan ipip"
for MOD in $MODULES; do
  if ! lsmod | grep -q "^$MOD"; then
    echo "Loading module: $MOD"
    sudo modprobe "$MOD" 2>/dev/null || echo "  WARNING: Could not load $MOD"
  fi
done

# Set sysctl parameters
sudo sysctl -w net.ipv4.ip_forward=1
sudo sysctl -w net.ipv6.conf.all.forwarding=1

# Verify fixes
echo ""
echo "Verifying fixes..."
sudo calicoctl node checksystem
```

## Verification

After fixing issues, re-run the check:

```bash
# Fix issues
sudo ./fix-system-requirements.sh

# Verify all checks pass
sudo calicoctl node checksystem
```

## Troubleshooting

- **Module cannot be loaded**: The kernel may not have the module compiled. Check with `find /lib/modules/$(uname -r) -name '<module>*'`. You may need to install additional kernel packages.
- **sysctl changes do not persist**: Ensure the file is in `/etc/sysctl.d/` and run `sudo sysctl --system` to apply.
- **Different requirements for VXLAN vs IPIP**: VXLAN requires the `vxlan` module while IPIP requires the `ipip` and `ip_tunnel` modules. Check which encapsulation you plan to use.
- **Minimal container OS missing modules**: Some container-optimized OS images strip kernel modules. You may need to use a different base image.

## Conclusion

Running `calicoctl node checksystem` before deploying Calico prevents the frustrating experience of a partially working network. By validating system requirements, loading missing kernel modules, and setting correct sysctl parameters, you ensure that Calico can fully function on every node in your cluster.
