# How to Clean Up Old Kernels to Free Disk Space on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Kernel, System Administration, Disk Cleanup, APT

Description: Learn how to safely remove old kernel versions on Ubuntu to free disk space on /boot, including manual removal with apt, using purge-old-kernels, and automating cleanup.

---

Ubuntu keeps multiple kernel versions installed as a safety net - if a new kernel causes problems, you can reboot into an older one. By default, the last two or three kernel versions are retained after each kernel upgrade. On systems that are updated regularly without cleanup, this accumulates quickly and can fill the `/boot` partition.

## Understanding the Problem

The `/boot` partition is typically 500 MB to 1 GB. Each kernel version takes about 50-100 MB. After a year of updates without cleanup, you can easily have 10-15 old kernels taking up the entire partition, causing `apt upgrade` to fail with:

```text
E: gzip: stdout: No space left on device
E: mkinitramfs failure cpio 141 gzip 1
```

## Check Current Kernel Usage

```bash
# See all installed kernel packages
dpkg -l | grep linux-image

# Check which kernel is currently running
uname -r

# Check /boot partition usage
df -h /boot

# List all files in /boot
ls -lah /boot/
```

Example output showing the problem:
```text
Filesystem      Size  Used Avail Use% Mounted on
/dev/sda1       976M  921M    0 100% /boot
```

## Identify What's Safe to Remove

The critical rule: **never remove the currently running kernel**.

```bash
# Currently running kernel
uname -r
# 6.5.0-26-generic

# List all installed kernel image packages
dpkg -l | grep linux-image | grep "^ii"

# Output shows installed kernels:
# ii  linux-image-5.15.0-91-generic    Installed but old
# ii  linux-image-5.15.0-94-generic    Installed but old
# ii  linux-image-6.5.0-25-generic     Installed but old
# ii  linux-image-6.5.0-26-generic     Currently running - DO NOT REMOVE
```

Keep at minimum two kernels: the current one and one previous version as a fallback.

## Method 1: apt autoremove (Recommended Starting Point)

Ubuntu marks older kernels as "automatically installed" and `apt autoremove` should clean them up:

```bash
# Check what autoremove would remove
sudo apt autoremove --dry-run

# Perform the cleanup
sudo apt autoremove --purge

# This removes old kernels AND their config files
```

If `autoremove` doesn't remove old kernels, it may be because they were manually installed or held. Move on to manual removal.

## Method 2: Manual Kernel Removal

For precise control over which kernels are removed:

```bash
# Check the current kernel
CURRENT_KERNEL=$(uname -r)
echo "Current: $CURRENT_KERNEL"

# List all installed kernel image packages
dpkg -l | grep linux-image | grep "^ii" | awk '{print $2}'

# Remove a specific old kernel version
# Replace with the actual version numbers you want to remove
sudo apt purge linux-image-5.15.0-91-generic \
               linux-headers-5.15.0-91-generic \
               linux-modules-5.15.0-91-generic \
               linux-modules-extra-5.15.0-91-generic

# Update GRUB after removing kernels
sudo update-grub
```

Always include all four package types for each kernel version: `linux-image`, `linux-headers`, `linux-modules`, and `linux-modules-extra`.

## Method 3: purge-old-kernels Script

The `byobu` package includes a convenient script:

```bash
# Install if not present
sudo apt install byobu

# Remove all but the two most recent kernels
sudo purge-old-kernels

# Keep only one previous kernel (more aggressive)
sudo purge-old-kernels --keep 1

# Dry run to see what it would remove
sudo purge-old-kernels --dry-run
```

`purge-old-kernels` is careful about the currently running kernel and is safe to use.

## Method 4: Using a Script for Automated Cleanup

For systems where you want to automate kernel cleanup:

```bash
#!/bin/bash
# cleanup-old-kernels.sh
# Removes all old kernels, keeping current + one previous

set -e

# Get the currently running kernel version
CURRENT=$(uname -r | sed 's/-generic//')

echo "Current kernel: $CURRENT"

# Get all installed kernel image packages sorted by version
KERNELS=$(dpkg -l | grep linux-image | grep "^ii" | \
    awk '{print $2}' | \
    grep -v "linux-image-generic" | \
    sort -V)

echo "Installed kernel packages:"
echo "$KERNELS"

# Count installed kernels
KERNEL_COUNT=$(echo "$KERNELS" | wc -l)

if [ "$KERNEL_COUNT" -le 2 ]; then
    echo "Only $KERNEL_COUNT kernel(s) installed, nothing to clean up"
    exit 0
fi

# Remove all but the last two (current + one previous)
TO_REMOVE=$(echo "$KERNELS" | head -n $((KERNEL_COUNT - 2)))

echo ""
echo "Kernels to remove:"
echo "$TO_REMOVE"

# Build the full list of packages to remove for each kernel version
for kernel_pkg in $TO_REMOVE; do
    # Extract version from package name
    version=$(echo "$kernel_pkg" | sed 's/linux-image-//')

    # Don't remove if it matches the current running kernel
    if echo "$version" | grep -q "$CURRENT"; then
        echo "Skipping $version (current kernel)"
        continue
    fi

    echo "Removing: $version"
    sudo apt purge -y \
        "linux-image-${version}" \
        "linux-headers-${version}" \
        "linux-modules-${version}" \
        "linux-modules-extra-${version}" \
        2>/dev/null || true
done

# Update GRUB
sudo update-grub

# Clean up package cache
sudo apt clean

echo "Cleanup complete"
df -h /boot
```

## Automating with Unattended-Upgrades

Configure unattended-upgrades to automatically remove old kernels:

```bash
# Edit the unattended-upgrades config
sudo nano /etc/apt/apt.conf.d/50unattended-upgrades

# Add or ensure these lines are uncommented:
Unattended-Upgrade::Remove-Unused-Kernel-Packages "true";
Unattended-Upgrade::Remove-New-Unused-Dependencies "true";
```

With these settings, after each automatic kernel upgrade, old kernels are removed automatically.

## Emergency Recovery: /boot Is 100% Full

If `/boot` is completely full and `apt` can't run:

```bash
# Check what's taking space
ls -lah /boot/ | sort -k5 -h

# Remove old initrd files manually (they get regenerated)
# Find all but the current kernel's initrd
CURRENT=$(uname -r)
ls /boot/initrd.img-* | grep -v "$CURRENT" | head -1
# Remove ONE old initrd to free enough space for apt to run
sudo rm /boot/initrd.img-5.15.0-91-generic

# Now try apt purge
sudo apt purge linux-image-5.15.0-91-generic

# After purge, regenerate any missing initrd files
sudo update-initramfs -u -k all
```

## Preventing /boot From Filling Up

Set up monitoring to alert before `/boot` fills:

```bash
# Add to /etc/cron.daily/check-boot-space
#!/bin/bash
BOOT_PERCENT=$(df /boot | tail -1 | awk '{print $5}' | tr -d '%')
THRESHOLD=80

if [ "$BOOT_PERCENT" -ge "$THRESHOLD" ]; then
    echo "WARNING: /boot is ${BOOT_PERCENT}% full" | \
        mail -s "Low /boot space on $(hostname)" root
fi
```

Or use a monitoring system with an alert for `/boot` usage above 75%.

## Verifying GRUB After Kernel Removal

After removing kernels, GRUB needs to be updated:

```bash
# Update GRUB menu
sudo update-grub

# Verify GRUB can find the current kernel
sudo grub-install --dry-run 2>&1 | head -5

# Check the GRUB config for the correct default kernel
grep "menuentry\|GRUB_DEFAULT" /boot/grub/grub.cfg | head -20
```

## Summary

Kernel cleanup on Ubuntu is a regular maintenance task for servers that receive frequent updates. The safest sequence is:

1. Check running kernel with `uname -r`
2. Try `sudo apt autoremove --purge` first
3. If that's insufficient, use `purge-old-kernels --keep 2` from the `byobu` package
4. For manual control, `sudo apt purge linux-image-VERSION` for each old kernel
5. Run `sudo update-grub` after any kernel removal
6. Enable `Remove-Unused-Kernel-Packages` in unattended-upgrades for automatic cleanup

Always keep at minimum two kernels - the running one and one previous - to maintain a safe fallback option.
