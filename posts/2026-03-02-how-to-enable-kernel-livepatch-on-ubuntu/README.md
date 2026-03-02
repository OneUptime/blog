# How to Enable Kernel Livepatch on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Livepatch, Kernel, Security, Ubuntu Pro

Description: Learn how to enable and configure Canonical's Kernel Livepatch service on Ubuntu to apply critical kernel security patches without rebooting your servers.

---

Kernel Livepatch patches the running Linux kernel in memory without requiring a reboot. When a critical kernel vulnerability is disclosed, Canonical prepares a livepatch and pushes it to subscribed systems. Within minutes of the patch being available, your kernel is protected - no maintenance window required, no service disruption.

This is not a replacement for kernel upgrades entirely, but it significantly reduces the urgency of rebooting. Instead of scheduling an emergency reboot at 2am when a kernel CVE drops, you can apply the livepatch immediately and schedule the actual kernel upgrade and reboot for your next maintenance window.

## Prerequisites

Livepatch requires:
- Ubuntu 16.04 LTS or later (20.04 and 22.04 are well-supported)
- Ubuntu Pro subscription (free for up to 5 machines)
- 64-bit x86 architecture
- A generic or lowlatency kernel (not HWE kernels older than a certain version)
- Internet access to reach livepatch.canonical.com

## Enabling Livepatch via Ubuntu Pro

The easiest path is through Ubuntu Pro:

```bash
# First attach Ubuntu Pro if not already attached
sudo pro attach <your-pro-token>

# Livepatch is enabled by default when attaching Pro
# Check if it's enabled
pro status | grep livepatch

# If not enabled, enable it explicitly
sudo pro enable livepatch

# Verify it's running
sudo canonical-livepatch status
```

## Enabling Livepatch with a Standalone Token

If you want Livepatch without the full Ubuntu Pro subscription (legacy path, still works):

```bash
# Install the canonical-livepatch daemon
sudo snap install canonical-livepatch

# Enable with your livepatch token
# Get a free token for up to 3 machines at https://ubuntu.com/livepatch
sudo canonical-livepatch enable <your-livepatch-token>

# Check status
sudo canonical-livepatch status
```

Note: The standalone token approach has different machine limits from Ubuntu Pro. The Pro token is generally preferred now.

## Checking Livepatch Status

```bash
# Basic status
sudo canonical-livepatch status

# Detailed status including patch information
sudo canonical-livepatch status --verbose

# Example output:
# Machine ID:  abc123...
# Machine token: [token]
# Status: active
# Tier:    updates
# Last check: 2026-03-02T08:00:00Z
# Kernel: 5.15.0-91-generic
# Fully patched: true
# Patches:
#   CVE-2024-XXXX: Applied
#   CVE-2024-YYYY: Applied
```

## Understanding Livepatch Output

```bash
sudo canonical-livepatch status --verbose
```

Key fields to understand:

- **Fully patched**: Whether all available patches have been applied
- **Tier**: `updates` means you get patches, `stable` means you get fewer but more tested patches
- **Kernel**: Which kernel is running (must match a supported kernel)
- **Patches**: List of CVEs addressed by currently applied patches

## Checking Kernel Compatibility

Livepatch supports specific kernel versions. Check if your kernel is supported:

```bash
# Check current kernel
uname -r

# List kernels that have livepatch support
# This information is available from Canonical's documentation
# Generally: latest 2-3 versions of generic/lowlatency kernels per LTS

# If your kernel is not supported, you need to update to a supported kernel
sudo apt update
sudo apt install --install-recommends linux-generic

# After reboot with new kernel:
sudo canonical-livepatch status
```

## Verifying Patches Are Applied

```bash
# Check if specific CVEs are patched
sudo canonical-livepatch status --verbose | grep -A5 "Patches"

# The output shows which CVEs have been livep-atched
# This does not mean those CVEs are only fixed by livepatch
# Rebooting to a patched kernel is still recommended during maintenance windows
```

## Livepatch and System Reboots

Livepatch reduces urgency but does not eliminate the need to eventually reboot:

```bash
# Check if a reboot is needed for non-livepatch updates
/usr/lib/update-notifier/update-motd-reboot-required 2>/dev/null || echo "No reboot required"

# Or
cat /run/reboot-required 2>/dev/null && echo "Reboot required" || echo "No reboot required"

# List what requires the reboot
cat /run/reboot-required.pkgs 2>/dev/null
```

With Livepatch covering critical kernel CVEs, reboots for kernel updates become a scheduled maintenance event rather than an emergency response.

## Monitoring Livepatch in Your Infrastructure

For infrastructure monitoring, integrate Livepatch status checks:

```bash
# Script to check livepatch health across servers
#!/bin/bash
# check_livepatch.sh

status=$(canonical-livepatch status 2>&1)

if echo "$status" | grep -q "Fully patched: true"; then
    echo "OK: Livepatch fully patched"
    exit 0
elif echo "$status" | grep -q "Fully patched: false"; then
    echo "WARNING: Livepatch not fully applied"
    echo "$status"
    exit 1
elif echo "$status" | grep -q "Machine token"; then
    echo "WARNING: Livepatch inactive"
    exit 2
else
    echo "UNKNOWN: Cannot determine livepatch status"
    echo "$status"
    exit 3
fi
```

For Nagios/Icinga-style monitoring, this script can be used as a check plugin.

### Prometheus Metrics

While Livepatch does not expose Prometheus metrics natively, you can wrap the status check:

```bash
#!/bin/bash
# livepatch_metrics.sh - Output Prometheus text format

status=$(canonical-livepatch status --verbose 2>/dev/null)

# Output 1 if fully patched, 0 otherwise
if echo "$status" | grep -q "Fully patched: true"; then
    echo "livepatch_fully_patched 1"
else
    echo "livepatch_fully_patched 0"
fi

# Output count of applied patches
patch_count=$(echo "$status" | grep -c "Applied" || echo "0")
echo "livepatch_patches_applied $patch_count"
```

## Configuring Livepatch Tier

```bash
# Check current tier
canonical-livepatch config | grep tier

# Tiers:
# stable   - Patches are released after more testing, slightly slower
# updates  - Patches released sooner (default for Ubuntu Pro)
# beta     - Early access to patches, not recommended for production

# Change tier (Pro subscription required for updates tier)
sudo canonical-livepatch config tier=stable
```

## Troubleshooting

### Livepatch Shows "Machine Not Enabled"

```bash
# Re-run enable command
sudo pro enable livepatch

# Or for standalone token
sudo canonical-livepatch enable <token>

# Check if the daemon is running
systemctl status canonical-livepatchd
```

### Kernel Not Supported

```bash
# Check if your kernel has a livepatch available
uname -r
# Example: 5.15.0-91-generic

# Update to a newer kernel if yours is too old
sudo apt update && sudo apt dist-upgrade
# Then reboot and check livepatch status

# View which Ubuntu kernels are currently supported for livepatch:
# https://ubuntu.com/security/livepatch
```

### Network Connectivity Issues

```bash
# Livepatch needs access to livepatch.canonical.com
curl -s https://livepatch.canonical.com/api/v1/ping

# Check proxy settings if applicable
canonical-livepatch config | grep proxy

# Set proxy
sudo canonical-livepatch config http-proxy=http://proxy.example.com:3128
sudo canonical-livepatch config https-proxy=http://proxy.example.com:3128
```

### Livepatch Daemon Not Starting

```bash
# Check daemon status
sudo systemctl status canonical-livepatchd

# View logs
journalctl -u canonical-livepatchd -n 50

# Restart the daemon
sudo systemctl restart canonical-livepatchd
```

Livepatch is particularly valuable for high-availability services where a reboot requires coordination, failover, and validation. For a three-node cluster where a rolling restart is a 30-minute process, being able to apply a kernel security fix in seconds without restarting anything is a significant operational improvement.
