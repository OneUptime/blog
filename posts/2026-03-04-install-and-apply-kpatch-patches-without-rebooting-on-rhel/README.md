# How to Install and Apply kpatch Patches Without Rebooting on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Kpatch, Security, Kernel, Patching

Description: Install and apply kernel live patches using kpatch on RHEL to fix security vulnerabilities in the running kernel without any system downtime.

---

When a critical kernel CVE is announced, you can apply the fix immediately using kpatch instead of waiting for a maintenance window to reboot. Here is the step-by-step process for finding, installing, and verifying live patches on RHEL.

## Identify Your Kernel Version

```bash
# Get the exact kernel version
uname -r
# Example output: 5.14.0-362.8.1.el9_3.x86_64

# Get the base kernel release (without architecture)
KVER=$(uname -r)
echo $KVER
```

## Find Available kpatch Patches

```bash
# Search for kpatch packages for your kernel
sudo dnf list available kpatch-patch* 2>/dev/null | grep $(uname -r | sed 's/\.[^.]*$//' | sed 's/-/_/g')

# List all available kpatch patches
sudo dnf list available kpatch-patch*
```

## Install the kpatch Patch

```bash
# Install kpatch if not already present
sudo dnf install -y kpatch

# Install the specific kpatch module for your kernel
# The package name follows the pattern: kpatch-patch-<kernel_version>
sudo dnf install -y kpatch-patch-5_14_0-362_8_1-el9_3

# The kpatch module loads automatically upon installation
```

## Verify the Patch is Applied

```bash
# List all loaded kpatch modules
kpatch list

# Example output:
# Loaded patch modules:
# kpatch_5_14_0_362_8_1_el9_3_1_1 [enabled]

# Check the livepatch subsystem
ls /sys/kernel/livepatch/

# Verify the patch is enabled
cat /sys/kernel/livepatch/kpatch_5_14_0_362_8_1_el9_3_1_1/enabled
# Output: 1 (enabled)
```

## Check What the Patch Fixes

```bash
# View the RPM changelog to see which CVEs are addressed
rpm -q --changelog kpatch-patch-5_14_0-362_8_1-el9_3

# Check the RPM description
rpm -qi kpatch-patch-5_14_0-362_8_1-el9_3
```

## Apply Multiple Patches

When multiple kpatch updates are available, they are cumulative:

```bash
# Update all installed kpatch modules to latest
sudo dnf update kpatch-patch*

# Verify all patches loaded
kpatch list
```

## Monitor kpatch in the Journal

```bash
# Check system journal for kpatch messages
journalctl -k | grep -i livepatch

# Watch for kpatch loading messages
sudo dmesg | grep -i "livepatch\|kpatch"
```

## Handle Kernel Updates

When you update the kernel itself, you need a new kpatch for the new kernel:

```bash
# After a kernel update and reboot
uname -r
# Shows the new kernel version

# Install the kpatch for the new kernel
sudo dnf install -y kpatch-patch-$(uname -r | sed 's/\.[^.]*$//' | sed 's/\./_/g' | sed 's/-/_/g')
```

## Automate with dnf-automatic

```bash
# Configure automatic security patching including kpatch
sudo dnf install -y dnf-automatic

sudo vi /etc/dnf/automatic.conf
```

```ini
[commands]
upgrade_type = security
apply_updates = yes
```

```bash
sudo systemctl enable --now dnf-automatic.timer
```

This workflow lets you patch critical kernel vulnerabilities on RHEL within minutes of a fix being available, without any system downtime.
