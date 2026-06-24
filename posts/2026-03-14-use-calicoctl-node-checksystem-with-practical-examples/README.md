# Using calicoctl node checksystem with Practical Examples

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, Calicoctl, System Requirements, Kubernetes, Pre-flight Checks

Description: Use calicoctl node checksystem to verify that a host meets all kernel and system requirements for running Calico, with practical pre-deployment validation examples.

---

## Introduction

Before deploying Calico on a new node, you need to verify that the host's kernel and module support meet Calico's requirements. The `calicoctl node checksystem` command performs these pre-flight checks automatically, verifying the kernel version and required kernel modules.

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
                5.15.0                                      OK
Checking kernel modules...
                xt_conntrack                                OK
                xt_u32                                      OK
WARNING: Unable to detect the xt_set module as Loaded/Builtin module or lsmod
                xt_set                                      FAIL
system doesn't meet one or more minimum systems requirements to run Calico
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

# Count issues. checksystem reports missing required modules as FAIL.
ERRORS=$(echo "$RESULT" | grep -c "FAIL" || true)
WARNINGS=$(echo "$RESULT" | grep -c "WARNING" || true)

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
# Load commonly required modules that match your dataplane and options
sudo modprobe ip_tables
sudo modprobe ip6_tables
sudo modprobe iptable_filter
sudo modprobe iptable_nat
sudo modprobe iptable_mangle
sudo modprobe ip_set
sudo modprobe xt_set
sudo modprobe xt_u32
sudo modprobe xt_mark
sudo modprobe xt_multiport
sudo modprobe xt_conntrack
sudo modprobe xt_addrtype
sudo modprobe nf_conntrack
sudo modprobe vxlan  # For VXLAN encapsulation
sudo modprobe ipip   # For IP-in-IP encapsulation

# Make modules persist across reboots
sudo tee /etc/modules-load.d/calico.conf > /dev/null << 'EOF'
ip_tables
ip6_tables
iptable_filter
iptable_nat
iptable_mangle
ip_set
xt_set
xt_u32
xt_mark
xt_multiport
xt_conntrack
xt_addrtype
nf_conntrack
vxlan
ipip
EOF
```

### Fixing sysctl Parameters

```bash
# Enable forwarding when required by your IPv4 or IPv6 deployment
sudo tee /etc/sysctl.d/99-calico.conf > /dev/null << 'EOF'
net.ipv4.ip_forward = 1
net.ipv6.conf.all.forwarding = 1
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
  
  ERRORS=$(ssh "$HOST" "sudo calicoctl node checksystem 2>&1 | grep -c FAIL || true" 2>/dev/null)
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
MODULES="ip_tables ip6_tables iptable_filter iptable_nat ip_set xt_set xt_u32 xt_mark xt_multiport xt_conntrack xt_addrtype nf_conntrack vxlan ipip"
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

Running `calicoctl node checksystem` before deploying Calico prevents the frustrating experience of a partially working network. By validating kernel compatibility, loading missing kernel modules, and setting required forwarding parameters for your deployment, you ensure that Calico can fully function on every node in your cluster.
