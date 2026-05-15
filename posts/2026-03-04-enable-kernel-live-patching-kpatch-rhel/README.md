# How to Enable Kernel Live Patching with kpatch on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Kpatch, Kernel Live Patching, Security, Linux

Description: Enable kernel live patching with kpatch on RHEL to apply critical security fixes to the running kernel without rebooting the system.

---

Kernel live patching allows you to apply security patches to the Linux kernel while the system is running, without requiring a reboot. This is critical for systems that need to maintain high availability while staying current with security fixes. Red Hat provides live patches through the kpatch framework.

## Prerequisites

You need an active RHEL subscription that includes kernel live patching support.

```bash
# Verify your subscription

sudo subscription-manager status

# Enable the BaseOS repository if it is not already enabled
sudo subscription-manager repos --enable=rhel-9-for-x86_64-baseos-rpms
```

## Install kpatch

```bash
# Install the kpatch client
sudo dnf install -y kpatch-dnf

# Verify the installation
rpm -q kpatch-dnf
```

## Enable Automatic Live Patching

```bash
# Enable automatic subscription to kernel live patches for installed kernels
sudo dnf kpatch auto

# Check available live patches for your current kernel
sudo dnf search "$(uname -r)"
```

## Install a Live Patch

```bash
# Search for available live patches
sudo dnf search kpatch-patch

# Install the live patch for your current kernel
sudo dnf install -y "kpatch-patch = $(uname -r)"

# The patch is applied immediately - no reboot required
```

## Verify Live Patches

```bash
# List all installed and loaded live patches
sudo kpatch list

# Check the status of applied patches
sudo kpatch info kpatch_5_14_0_1_0_1

# Verify the patch is loaded in the kernel
lsmod | grep kpatch
```

## How Live Patching Works

When you install a kpatch package, the following happens automatically:

1. The patch module is installed to `/var/lib/kpatch/`
2. kpatch loads the module into the running kernel
3. The patched functions replace the original kernel functions
4. No reboot is needed

```bash
# View the installed patch modules
ls /var/lib/kpatch/$(uname -r)/

# Check kernel messages for patch loading
dmesg | grep kpatch
```

## Configure Automatic Live Patch Installation

```bash
# Enable automatic installation of live patches via DNF
# The kpatch-dnf plugin handles this after auto mode is enabled
# Verify the plugin is enabled
sudo dnf kpatch status

# Live patches are included in regular dnf update operations
sudo dnf update
```

## Remove a Live Patch

```bash
# Select the installed live patch package
sudo dnf list installed | grep kpatch-patch

# Remove the kpatch package for the kernel
sudo dnf remove kpatch-patch-5_14_0-1.x86_64

# Reboot so the kernel is no longer patched
sudo reboot

# Verify it was removed
sudo dnf list installed | grep kpatch-patch
```

## Check if a Reboot Is Still Needed

Some fixes cannot be live patched and still require a reboot.

```bash
# Check if the system needs a reboot for any pending updates
sudo dnf needs-restarting -r

# List services that need restarting
sudo dnf needs-restarting -s
```

## Limitations

Live patching has some constraints:

- Live patches cover selected security and bug fixes, but not all critical or important CVEs
- Data structure changes cannot be live patched
- Live patches are available for the latest minor release kernels
- A full kernel update and reboot is still recommended during maintenance windows

```bash
# Check which CVEs are covered by installed live patches
rpm -q --changelog kpatch-patch-* | head -30
```

Kernel live patching with kpatch keeps your RHEL systems protected against critical vulnerabilities without sacrificing uptime.
