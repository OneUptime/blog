# How to List and Switch Between Installed Kernels on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Linux Kernel, System Administration, GRUB, Boot

Description: Learn how to list installed kernels on Ubuntu, check which kernel is running, switch between kernel versions, and manage kernel installations for testing and rollback purposes.

---

Ubuntu systems sometimes need to run on a specific kernel version - whether that's testing a newer kernel for bug fixes, rolling back to an older version after an update caused problems, or maintaining compatibility with specific hardware drivers. Managing kernel versions is a common administration task that's straightforward once you understand how Ubuntu handles kernel packages and bootloader configuration.

## Checking the Running Kernel

```bash
# Show running kernel version
uname -r
```

Output: `5.15.0-91-generic`

```bash
# More detailed kernel info
uname -a

# Show kernel version and build info
cat /proc/version
```

## Listing Installed Kernels

### Using dpkg

```bash
# List all installed kernel image packages
dpkg --list | grep linux-image

# Clean output - just the version numbers
dpkg --list | grep linux-image | awk '{print $2}'
```

Example output:

```text
linux-image-5.15.0-89-generic
linux-image-5.15.0-91-generic
linux-image-6.2.0-39-generic
```

### Checking GRUB Entries

GRUB maintains the list of available boot entries:

```bash
# List all GRUB menu entries (requires grub-common)
grep -E "^menuentry|submenu" /boot/grub/grub.cfg | head -30

# More readable list
awk -F\' '/^menuentry |^submenu / {print $2}' /boot/grub/grub.cfg
```

### Using ls on /boot

```bash
# List kernel vmlinuz files
ls -la /boot/vmlinuz-*

# List initrd images
ls -la /boot/initrd.img-*

# Summary of installed kernels
ls /boot/vmlinuz-* | sed 's|/boot/vmlinuz-||'
```

## Temporarily Booting a Different Kernel

To test a specific kernel version at next boot (one time), use `grub-reboot`:

```bash
# List available GRUB entries with their numbers
awk -F\' '/^menuentry |^submenu / {print NR-1, $2}' /boot/grub/grub.cfg

# Boot into a specific entry once (using the entry number)
sudo grub-reboot 2

# If kernels are in a submenu, use the submenu index format
# Example: "1>2" means submenu 1, entry 2
sudo grub-reboot "1>2"

# Reboot to apply
sudo reboot
```

After the temporary reboot, the system returns to the default kernel on the next boot.

## Permanently Setting the Default Kernel

### Method 1: Use grub-set-default

```bash
# First, find the exact menu entry name
awk -F\' '/^menuentry |^submenu / {print NR-1, $2}' /boot/grub/grub.cfg

# Set the default by entry number
sudo grub-set-default 2

# Or by name
sudo grub-set-default "Ubuntu, with Linux 5.15.0-89-generic"

# Update GRUB
sudo update-grub
```

### Method 2: Edit /etc/default/grub

```bash
sudo nano /etc/default/grub
```

Change `GRUB_DEFAULT`:

```bash
# Use a specific kernel name (must match grub.cfg menuentry exactly)
GRUB_DEFAULT="Advanced options for Ubuntu>Ubuntu, with Linux 5.15.0-89-generic"

# Or use a number (0 = first entry, which may change after updates)
GRUB_DEFAULT=2

# Or use "saved" to allow grub-set-default to control the default
GRUB_DEFAULT=saved
```

If using `saved`, also enable:

```bash
GRUB_SAVEDEFAULT=true
```

Apply changes:

```bash
sudo update-grub
```

## Installing a Specific Kernel Version

Install kernels from Ubuntu repositories:

```bash
# Search available kernel versions
apt-cache search linux-image | grep generic | sort -V

# Install a specific version
sudo apt install linux-image-5.15.0-89-generic linux-modules-5.15.0-89-generic

# Also install headers if needed (for DKMS modules like ZFS, VirtualBox)
sudo apt install linux-headers-5.15.0-89-generic
```

After installation, update GRUB:

```bash
sudo update-grub
```

## Installing the Mainline Kernel

For testing a newer upstream kernel:

```bash
# Using the Ubuntu Mainline Kernel PPA tool
sudo apt install curl -y

# Download and install from Ubuntu mainline kernel builds
# Find builds at: https://kernel.ubuntu.com/~kernel-ppa/mainline/

VERSION="v6.8"
cd /tmp
wget "https://kernel.ubuntu.com/~kernel-ppa/mainline/${VERSION}/amd64/linux-image-unsigned-*.deb" -A "*.deb" -r -l 1 -nd

# Install all downloaded packages
sudo dpkg -i linux-*.deb
sudo update-grub
```

## Removing Old Kernels

After testing, remove kernels you no longer need:

```bash
# Remove a specific kernel
sudo apt remove linux-image-5.15.0-89-generic

# Also remove associated headers and modules
sudo apt remove linux-headers-5.15.0-89-generic linux-modules-5.15.0-89-generic

# Auto-remove old kernels (keeps current + previous)
sudo apt autoremove

# Check what would be removed before doing it
apt list --installed | grep linux-image
```

Important: never remove the currently running kernel. Verify before removing:

```bash
# Current kernel - DO NOT remove this one
uname -r

# Safe to remove anything NOT matching the above
dpkg --list | grep linux-image | grep -v $(uname -r) | grep -v "linux-image-generic"
```

## Keeping Specific Kernels (Preventing Auto-Removal)

```bash
# Hold a kernel package to prevent removal during apt autoremove
sudo apt-mark hold linux-image-5.15.0-89-generic

# Check held packages
apt-mark showhold

# Unhold
sudo apt-mark unhold linux-image-5.15.0-89-generic
```

## Verifying the Active Kernel After Reboot

After switching kernels, verify the change:

```bash
# Confirm running kernel version
uname -r

# Check kernel in /proc
cat /proc/version

# Check dmesg for boot messages about the kernel
dmesg | head -5
```

## GRUB Timeout Configuration

If you want time to select a kernel at boot:

```bash
sudo nano /etc/default/grub
```

```bash
# Show GRUB menu for 10 seconds (default is 0 or 5)
GRUB_TIMEOUT=10

# Show GRUB menu always (even if only one kernel)
GRUB_TIMEOUT_STYLE=menu
```

```bash
sudo update-grub
```

## Automated Kernel Management

For servers where you want to maintain a rolling window of available kernels:

```bash
#!/bin/bash
# list-kernels.sh - show installed kernels and current running version

CURRENT=$(uname -r)
echo "Currently running: $CURRENT"
echo ""
echo "Installed kernels:"

dpkg --list | grep "linux-image-[0-9]" | awk '{print $2}' | while read pkg; do
    version=${pkg#linux-image-}
    if [ "$version" = "$CURRENT" ]; then
        echo "  * $version (current)"
    else
        echo "    $version"
    fi
done
```

## Dealing with Broken Kernels

If a kernel update breaks your system and you need to boot the old kernel:

1. At boot, hold Shift (BIOS) or Esc (UEFI) to enter the GRUB menu
2. Select "Advanced options for Ubuntu"
3. Select the previous kernel version
4. Boot and verify the old kernel works
5. Remove the broken kernel:

```bash
sudo apt remove linux-image-<broken-version>
sudo update-grub
```

Then report the bug to Ubuntu before it affects others who update.

Managing kernel versions effectively is part of maintaining a stable system. The ability to boot into an older kernel is one of Ubuntu's practical reliability features - but you need to know how to use it before you need it.
