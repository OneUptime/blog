# How to Enable Kernel Live Patching with kpatch on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, kpatch, Kernel, Live Patching, Security

Description: Enable kernel live patching with kpatch on RHEL to apply critical security fixes to a running kernel without rebooting the system.

---

Kernel live patching lets you apply security fixes to the running kernel without scheduling downtime. On RHEL, kpatch is the supported mechanism for this. Red Hat provides pre-built live patches for critical and important CVEs.

## Install kpatch

```bash
# Install the kpatch client
sudo dnf install -y kpatch

# Verify installation
kpatch --version
```

## Check Your Running Kernel

```bash
# Display the current kernel version
uname -r

# kpatch patches must match your exact kernel version
```

## Subscribe to the Live Patching Channel

Ensure your system is registered and has access to the live patching repository:

```bash
# Check available repositories
sudo dnf repolist

# Enable the kernel live patching repo (RHEL 9)
sudo subscription-manager repos --enable=rhel-9-for-x86_64-livepatch-rpms

# Verify it is enabled
sudo dnf repolist | grep livepatch
```

## Install Available kpatch Modules

```bash
# Search for kpatch modules matching your kernel
sudo dnf search kpatch-patch-$(uname -r | sed 's/\.el.*//')

# Install the kpatch module for your kernel version
sudo dnf install -y kpatch-patch-$(uname -r | sed 's/\.[^.]*$//')
```

## Verify the Patch is Loaded

```bash
# List loaded kpatch modules
kpatch list

# Check the kernel log for kpatch messages
sudo dmesg | grep kpatch

# Verify the livepatch is active
cat /sys/kernel/livepatch/*/enabled
```

## Enable Automatic Live Patching

Set up automatic patching so new patches install when available:

```bash
# Install kpatch-dnf plugin for automatic updates
sudo dnf install -y kpatch-dnf

# Enable automatic kpatch updates
sudo systemctl enable --now dnf-automatic.timer
```

Configure dnf-automatic to install security patches:

```bash
sudo vi /etc/dnf/automatic.conf
```

```ini
[commands]
apply_updates = yes
upgrade_type = security
```

## Check Which CVEs are Patched

```bash
# View the changelog of installed kpatch modules
rpm -q --changelog kpatch-patch-* | head -50

# Check for specific CVEs
rpm -q --changelog kpatch-patch-* | grep CVE
```

## Revert a Live Patch

If needed, you can unload a kpatch module:

```bash
# List loaded patches
kpatch list

# Unload a specific patch
sudo kpatch unload kpatch_module_name
```

Note that unloading a live patch restores the original vulnerable code until the next reboot.

Kernel live patching with kpatch keeps your RHEL systems secure without interrupting running services or requiring maintenance windows.
