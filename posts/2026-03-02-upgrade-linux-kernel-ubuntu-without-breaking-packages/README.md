# How to Upgrade the Linux Kernel on Ubuntu Without Breaking Packages

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Kernel, Package Management, System Administration

Description: A safe approach to upgrading the Linux kernel on Ubuntu Server, covering kernel selection, DKMS module management, testing, and rollback procedures.

---

The Linux kernel is the most critical piece of software on your server. Upgrading it incorrectly can leave you with a system that does not boot or has broken drivers and kernel modules. Done carefully, kernel upgrades are routine maintenance - but "carefully" means understanding what changes and having a rollback plan.

## Understanding Kernel Management on Ubuntu

Ubuntu manages kernels as regular apt packages. The key packages:

- `linux-image-VERSION` - The actual kernel binary
- `linux-headers-VERSION` - Header files needed to build kernel modules
- `linux-modules-VERSION` - Kernel modules for the kernel
- `linux-generic` - Meta-package that depends on the current recommended kernel
- `linux-image-generic` - Meta-package for the kernel image

Ubuntu keeps old kernels installed alongside new ones. GRUB shows all available kernels at boot, allowing rollback by selecting an older kernel if the new one fails.

```bash
# Check currently running kernel
uname -r

# Check installed kernels
dpkg --list | grep linux-image | grep "^ii"

# Check which kernel is the default
grub-reboot --output-name
```

## Types of Kernel Upgrades

### Security Updates (Minor Version Bumps)

These happen automatically via `apt upgrade`. For example, upgrading from `5.15.0-100` to `5.15.0-101` (same major version, new build with security patches). These are low risk.

```bash
# These apply automatically with normal apt updates
sudo apt update && sudo apt upgrade
```

### HWE (Hardware Enablement) Kernel Upgrades

HWE kernels bring newer upstream kernel versions to LTS releases:

```bash
# On Ubuntu 22.04, the GA kernel is 5.15
# The HWE kernel for 22.04 tracks the 23.04/23.10/24.04 kernels

# Check if HWE kernel is available
apt-cache search linux-generic-hwe

# Install HWE kernel for Ubuntu 22.04
sudo apt install linux-generic-hwe-22.04
```

### Custom Kernel Versions (from Mainline PPA)

For specific kernel versions not in the standard Ubuntu repositories, Canonical's kernel team maintains a mainline PPA. These are for testing and specialized workloads - not recommended for production.

## Before Upgrading: Check for DKMS Modules

DKMS (Dynamic Kernel Module Support) modules are the main source of kernel upgrade failures. These are modules not in the mainline kernel that are compiled for each installed kernel:

```bash
# List installed DKMS modules
dkms status

# Example output:
# nvidia, 535.154.05, 5.15.0-100-generic, x86_64: installed
# vboxdrv, 7.0.10, 5.15.0-100-generic, x86_64: installed
# zfs, 2.1.5, 5.15.0-100-generic, x86_64: installed

# Check if module source is available for building against new kernel
ls /usr/src/ | grep -i nvidia
```

If you have DKMS modules, the kernel upgrade process will automatically try to rebuild them. If the build fails, the new kernel will be missing those modules.

## Checking for Available Kernel Updates

```bash
# See if a newer kernel is available
apt-cache policy linux-generic linux-image-generic

# Check current vs candidate version
apt list --upgradable | grep linux

# Simulate the upgrade
sudo apt --dry-run upgrade | grep linux
```

## Upgrading the Kernel

```bash
# Standard upgrade (includes kernel if there is a security update)
sudo apt update && sudo apt upgrade

# If the kernel was held back (due to dependency changes):
sudo apt dist-upgrade

# Explicitly install a specific kernel version
sudo apt install linux-image-6.8.0-40-generic linux-headers-6.8.0-40-generic

# After kernel upgrade, a reboot is required
# Check if reboot is needed
[ -f /var/run/reboot-required ] && echo "Reboot required"
```

## Verifying the Upgrade Will Succeed Before Rebooting

Before rebooting into the new kernel, check that DKMS modules compiled successfully:

```bash
# After apt install completes, check dkms status for the new kernel
NEW_KERNEL=$(apt-cache policy linux-image-generic | grep "Candidate:" | awk '{print $2}' | sed 's/linux-image-//' 2>/dev/null || uname -r)

# Check dkms status for new kernel version
dkms status | grep "$NEW_KERNEL"

# If any modules show "built" but not "installed" or are missing, investigate
# before rebooting
```

Check that the kernel was installed completely:

```bash
# Check initramfs was generated for the new kernel
ls -la /boot/initrd.img-*

# Verify GRUB was updated
grep -c "menuentry" /boot/grub/grub.cfg

# Check /boot is not full
df -h /boot
```

## Handling DKMS Build Failures

If a DKMS module fails to build for the new kernel:

```bash
# Check the build log
ls /var/lib/dkms/module-name/

# View the build error
cat /var/lib/dkms/module-name/VERSION/build/make.log | tail -50

# Common causes:
# 1. Module source is too old for new kernel API
# 2. Missing kernel headers

# Ensure kernel headers are installed
sudo apt install linux-headers-$(uname -r)

# Try to manually build the DKMS module
sudo dkms build module-name/VERSION
sudo dkms install module-name/VERSION
```

For NVIDIA drivers specifically, matching driver version to kernel version is critical:

```bash
# Check NVIDIA driver status
nvidia-smi

# If NVIDIA module is missing for new kernel
sudo apt install nvidia-dkms-535
sudo dkms install nvidia/535.154.05 --kernelver NEW_KERNEL_VERSION
```

## Rebooting and Verifying

```bash
# Reboot
sudo reboot

# After reboot, verify the new kernel is running
uname -r

# Verify all modules loaded correctly
dmesg | grep -E "error|fail|DKMS" | grep -v "firmware"

# Verify hardware that depends on DKMS modules works
# For NVIDIA:
nvidia-smi

# For ZFS:
sudo zpool status

# For VirtualBox:
lsmod | grep vboxdrv
```

## Rolling Back to a Previous Kernel

If the new kernel causes issues, the old kernel remains installed and is available at boot:

```bash
# Reboot and hold Shift during POST to show GRUB menu
# Select "Advanced options for Ubuntu"
# Select the old kernel version

# After booting the old kernel, verify it is working
uname -r

# Make the old kernel the default temporarily
sudo grub-reboot "Advanced options for Ubuntu>Ubuntu, with Linux 6.8.0-35-generic"

# For a permanent default, set the GRUB_DEFAULT in /etc/default/grub
sudo nano /etc/default/grub
# Set: GRUB_DEFAULT="Advanced options for Ubuntu>Ubuntu, with Linux 6.8.0-35-generic"
sudo update-grub
```

## Removing Old Kernels

Ubuntu accumulates old kernels over time. Clean them up after verifying the new kernel works:

```bash
# Check installed kernels
dpkg --list | grep linux-image | grep "^ii"

# Remove old kernels (keeps the current and one previous)
sudo apt autoremove --purge

# If autoremove does not remove them, identify old kernel versions
uname -r  # Current kernel - do NOT remove this

# Manually remove an old kernel (replace with actual version)
sudo apt remove --purge linux-image-5.15.0-99-generic linux-headers-5.15.0-99-generic
sudo update-grub
```

## Avoiding Kernel-Breaking Mistakes

**Do not remove kernel packages manually without checking what depends on them.** The meta-packages (`linux-generic`, etc.) depend on specific kernel versions:

```bash
# Check what depends on a kernel package before removing
apt-cache rdepends linux-image-6.8.0-35-generic | head -20
```

**Do not modify `/boot/grub/grub.cfg` directly.** This file is auto-generated. Edit `/etc/default/grub` and run `sudo update-grub`.

**Keep at least one old kernel** until you have verified the new one is stable in production. The disk space cost of one extra kernel package is acceptable insurance.

**Test in non-production first.** Especially for DKMS-heavy systems (NVIDIA, ZFS, VirtualBox hosts), test the kernel upgrade on a staging machine first.

## Monitoring After Kernel Upgrades

```bash
# Check for kernel panics in the last boot
sudo journalctl -k -b -1 -p "err..alert"

# Watch for driver errors in current boot
sudo dmesg -T | grep -E -i "error|fail|warning" | grep -v "Bluetooth\|USB"

# Check system call audit log for anomalies
sudo ausearch -ts recent -m AVC 2>/dev/null | head -20
```

Kernel upgrades are one of the lower-risk maintenance tasks when done systematically: check DKMS compatibility, upgrade, verify compilation succeeded, reboot, verify hardware works, clean up old kernels. The risk comes from rushing through these steps or skipping the verification before the reboot.
