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

# Enable the kernel live patching repository
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
# Enable the kpatch DNF plugin to automatically apply live patches
# during regular system updates
sudo dnf install -y kpatch-dnf

# Check available live patches for your current kernel
sudo dnf list available kpatch-patch-$(uname -r | sed 's/\.[^.]*$//')* 2>/dev/null
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
sudo kpatch info

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
# The kpatch-dnf plugin handles this automatically
# Verify the plugin is enabled
sudo dnf config-manager --dump kpatch-dnf 2>/dev/null

# Live patches are included in regular dnf update operations
sudo dnf update
```

## Remove a Live Patch

```bash
# Unload a live patch from the running kernel
sudo kpatch unload <patch-module-name>

# Remove the kpatch package
sudo dnf remove kpatch-patch-*

# Verify it was removed
sudo kpatch list
```

## Check if a Reboot Is Still Needed

Some fixes cannot be live patched and still require a reboot.

```bash
# Check if the system needs a reboot for any pending updates
sudo needs-restarting -r

# List services that need restarting
sudo needs-restarting -s
```

## Limitations

Live patching has some constraints:

- Only critical and important security fixes are provided as live patches
- Data structure changes cannot be live patched
- Live patches are available for the latest minor release kernels
- A full kernel update and reboot is still recommended during maintenance windows

```bash
# Check which CVEs are covered by installed live patches
rpm -q --changelog kpatch-patch-* | head -30
```

Kernel live patching with kpatch keeps your RHEL systems protected against critical vulnerabilities without sacrificing uptime.
