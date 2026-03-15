# Troubleshooting Errors in calicoctl node diags

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, calicoctl, Diagnostics, Troubleshooting, Kubernetes

Description: Resolve errors encountered when running calicoctl node diags, including permission issues, missing binaries, and incomplete diagnostic bundles.

---

## Introduction

The `calicoctl node diags` command collects system-level information that requires elevated privileges and access to various system utilities. When it fails or produces incomplete results, you lose a critical troubleshooting tool at exactly the moment you need it most.

This guide addresses common errors encountered when running `calicoctl node diags` and provides solutions to ensure you can always collect the diagnostic information you need.

## Prerequisites

- A host or Kubernetes pod running Calico
- Root or sudo access
- `calicoctl` installed
- Basic understanding of Linux system tools

## Error: Permission Denied

```yaml
Error: permission denied while collecting diagnostics
```

The diags command needs root privileges to access iptables, routing tables, and log files:

```bash
# Always run with sudo
sudo calicoctl node diags

# In Kubernetes, exec into the calico-node pod (which runs as privileged)
kubectl exec -n calico-system <pod-name> -- calicoctl node diags
```

## Error: Disk Space Insufficient

```yaml
Error: no space left on device
```

```bash
# Check available disk space
df -h /tmp

# Specify a different output directory with more space
sudo calicoctl node diags --output-dir=/var/tmp/

# Clean up old diagnostic bundles
rm -f /tmp/calico-diags-*.tar.gz
```

## Error: Command Not Found (iptables, ip, etc.)

When system utilities are missing from the PATH:

```bash
# Check which utilities are available
which iptables ip ipset ss netstat 2>/dev/null

# In minimal container images, install missing tools
# For calico-node containers, most tools should be included

# Set PATH explicitly if needed
export PATH=$PATH:/sbin:/usr/sbin
sudo -E calicoctl node diags
```

## Error: Cannot Access Log Files

```yaml
Warning: unable to read log directory /var/log/calico
```

```bash
# Check if log directory exists and has content
ls -la /var/log/calico/

# In Kubernetes, logs may be in a different location
kubectl exec -n calico-system <pod-name> -- ls /var/log/calico/

# If logs are sent to stdout only, they will not be in the log directory
# Collect container logs separately
kubectl logs -n calico-system <pod-name> --tail=1000 > calico-node-stdout.log
```

## Error: Diagnostic Bundle Incomplete

Sometimes the command succeeds but the bundle is missing expected files:

```bash
# List contents and check for missing critical files
tar tzf calico-diags-*.tar.gz | sort

# Expected critical files
EXPECTED="iptables ip-route ip-addr bgp-status hostname date"
for FILE in $EXPECTED; do
  if tar tzf calico-diags-*.tar.gz | grep -q "$FILE"; then
    echo "FOUND: $FILE"
  else
    echo "MISSING: $FILE"
  fi
done
```

If files are missing, collect them manually:

```bash
#!/bin/bash
# manual-diags.sh
# Collects diagnostics manually when calicoctl node diags fails

DIAG_DIR="/tmp/manual-calico-diags-$(date +%Y%m%d-%H%M%S)"
mkdir -p "$DIAG_DIR"

date > "$DIAG_DIR/date"
hostname > "$DIAG_DIR/hostname"
ip addr > "$DIAG_DIR/ip-addr" 2>&1
ip route > "$DIAG_DIR/ip-route" 2>&1
ip rule > "$DIAG_DIR/ip-rule" 2>&1
iptables-save > "$DIAG_DIR/iptables" 2>&1
ip6tables-save > "$DIAG_DIR/ip6tables" 2>&1
ipset list > "$DIAG_DIR/ipset-list" 2>&1

# Collect calico logs if available
cp -r /var/log/calico "$DIAG_DIR/calico-logs" 2>/dev/null

# BGP status
calicoctl node status > "$DIAG_DIR/bgp-status" 2>&1

# Create bundle
tar czf "${DIAG_DIR}.tar.gz" -C /tmp "$(basename $DIAG_DIR)"
echo "Manual diagnostics saved to ${DIAG_DIR}.tar.gz"
```

## Error: Timeout During Collection

On heavily loaded nodes, diagnostic collection may be slow:

```bash
# Run with increased timeout
timeout 300 sudo calicoctl node diags

# If specific collections are slow, identify which one
# by running components individually
echo "Collecting iptables..."
time iptables-save > /dev/null
echo "Collecting routes..."
time ip route > /dev/null
echo "Collecting ipsets..."
time ipset list > /dev/null
```

## Verification

After resolving errors, verify the diagnostic bundle is complete:

```bash
# Collect fresh diagnostics
sudo calicoctl node diags

# Verify the bundle
BUNDLE=$(ls -t /tmp/calico-diags-*.tar.gz | head -1)
echo "Bundle: $BUNDLE"
echo "Size: $(du -h $BUNDLE | cut -f1)"
echo "Files: $(tar tzf $BUNDLE | wc -l)"
```

## Troubleshooting

| Error | Cause | Fix |
|-------|-------|-----|
| Permission denied | Not running as root | Use sudo |
| No space left | /tmp full | Clean up or use --output-dir |
| Command not found | Missing system tools | Set PATH or install tools |
| Cannot read logs | Log directory missing | Check Calico log configuration |
| Timeout | Heavy system load | Increase timeout, collect manually |

## Conclusion

When `calicoctl node diags` itself has errors, the manual collection script provides a fallback. By understanding what the diagnostic command collects and how to gather that information manually, you ensure you can always get the troubleshooting data you need, regardless of the specific error encountered.
