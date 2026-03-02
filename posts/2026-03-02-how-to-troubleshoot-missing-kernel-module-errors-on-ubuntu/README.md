# How to Troubleshoot Missing Kernel Module Errors on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Kernel, Troubleshooting, Drivers, System Administration

Description: Diagnose and fix missing kernel module errors on Ubuntu, from identifying the needed module to installing drivers and rebuilding initramfs.

---

Missing kernel module errors can appear in several forms: a device that does not work, an error in `dmesg` about a module not found, or a service that fails to start because it cannot load a kernel feature. Tracking down the root cause requires understanding how kernel modules are organized on Ubuntu and working through a systematic diagnostic process.

## Understanding the Error

Missing module errors typically appear in a few different ways.

```bash
# "FATAL: Module not found" when using modprobe
sudo modprobe somefs
# FATAL: Module somefs not found in directory /lib/modules/6.8.0-52-generic

# Device not working, check dmesg
dmesg | tail -30
# Might show: "request_module: module not found"

# Service fails due to missing module
sudo systemctl status someservice
# Might show: "Failed to load kernel module"
```

## Checking If the Module Exists

```bash
# Search for the module across all installed kernels
find /lib/modules/ -name "*.ko*" | xargs ls 2>/dev/null | grep -i modulename

# Search for the module in the current kernel
find /lib/modules/$(uname -r)/ -name "*.ko*" | grep -i modulename

# Check if the module is compiled into the kernel (not as a module)
cat /boot/config-$(uname -r) | grep -i CONFIG_MODULE_NAME
# If it shows "y", the feature is built-in (not loadable)
# If it shows "m", it should be a loadable module
# If it shows "n" or is absent, the kernel was not compiled with this feature
```

## Module Not in Current Kernel, Available in Extra Packages

Ubuntu splits kernel modules across several packages. The main module package is `linux-modules-<version>`, but additional drivers are in `linux-modules-extra-<version>`.

```bash
# Install the extra modules package for your kernel
sudo apt install linux-modules-extra-$(uname -r)

# After installing, check if the module is now available
sudo modprobe modulename

# For HWE (Hardware Enablement) kernels
sudo apt install linux-modules-extra-hwe-22.04

# List what modules are in the extra package
dpkg -L linux-modules-extra-$(uname -r) | grep ".ko"
```

## Finding Which Package Provides a Module

```bash
# Search apt for the module file
apt-file search modulename.ko
# If apt-file is not installed:
sudo apt install apt-file
sudo apt-file update
apt-file search modulename.ko

# Search the package contents database
dpkg -S modulename 2>/dev/null

# For a module you know the name of (e.g., 8021q for VLAN):
apt-file search 8021q.ko
```

## Checking for Module Dependencies

A module may fail to load because one of its dependencies is missing.

```bash
# View module dependencies
modinfo -F depends modulename

# Recursively load all dependencies
sudo modprobe --show-depends modulename

# Example output:
# insmod /lib/modules/6.8.0-52-generic/kernel/drivers/net/ethernet/intel/igb/igb.ko
# modprobe requires: dca i2c-core ptp

# Load dependencies manually if needed
sudo modprobe dca
sudo modprobe i2c-core
sudo modprobe ptp
sudo modprobe igb
```

## Module Removed by Blacklist

If a module exists but refuses to load, check for blacklisting.

```bash
# Check all blacklist configurations
grep -r "blacklist" /etc/modprobe.d/
grep -r "blacklist" /lib/modprobe.d/

# Check if a specific module is blacklisted
grep "blacklist.*modulename" /etc/modprobe.d/*.conf /lib/modprobe.d/*.conf 2>/dev/null

# Temporarily override a blacklist (for testing)
sudo modprobe -f modulename

# Permanently remove a blacklist entry
sudo nano /etc/modprobe.d/blacklist-somefile.conf
# Comment out or delete the relevant blacklist line
sudo update-initramfs -u
```

## Module Not Loading at Boot

If a module needs to load at boot but does not appear in `lsmod` after startup.

```bash
# Check which modules are configured to load at boot
cat /etc/modules

# Add a module to load at boot
echo "modulename" | sudo tee -a /etc/modules

# Alternatively, create a file in /etc/modules-load.d/
sudo tee /etc/modules-load.d/modulename.conf << 'EOF'
# Load modulename at boot
modulename
EOF

# Reload the modules configuration
sudo systemctl restart systemd-modules-load.service

# Check for errors in the module loading service
sudo journalctl -u systemd-modules-load -b
```

## Missing Module in Initramfs

If a module is needed early in boot (for the root filesystem, for example), it must be included in the initramfs.

```bash
# Check what modules are currently in initramfs
lsinitramfs /boot/initrd.img-$(uname -r) | grep ".ko"

# Add a module to initramfs
sudo tee /etc/initramfs-tools/modules << 'EOF'
# Modules to include in initramfs
modulename
EOF

# Rebuild initramfs
sudo update-initramfs -u

# Verify the module is included
lsinitramfs /boot/initrd.img-$(uname -r) | grep modulename
```

## Module ABI Mismatch

After a partial kernel upgrade or using a module compiled for a different kernel version.

```bash
# Check module version vs running kernel
modinfo modulename | grep -E "vermagic|filename"
# vermagic should match the running kernel version

# Check running kernel
uname -r

# If there is a mismatch, the module was compiled for the wrong kernel
# Reinstall the module package
sudo apt reinstall linux-modules-extra-$(uname -r)

# If using DKMS, rebuild for the current kernel
dkms status
sudo dkms install -m modulename -v moduleversion -k $(uname -r)
```

## Finding the Module Name When You Know the Device

```bash
# Find which module handles a PCI device
lspci -k
# Look for "Kernel driver in use:" and "Kernel modules:" lines

# Find module for a USB device
lsusb
# Get vendor:product IDs, then:
# modinfo usbcore | grep "alias.*VendorID:ProductID"

# Use udevadm to find the right module for any device
udevadm info --attribute-walk /sys/class/net/eth0 | grep DRIVER
```

## Kernel Module Signing Errors (Secure Boot)

```bash
# Error: Required key not available
sudo journalctl -k | grep "Required key not available"

# Check Secure Boot state
mokutil --sb-state

# List enrolled signing keys
mokutil --list-enrolled

# If a DKMS module fails because of signing, the module needs to be signed
# See the DKMS documentation or disable Secure Boot for testing purposes
sudo mokutil --disable-validation
# (Requires reboot and entering a password at the MOK screen)
```

## Rebuilding Module Dependencies

After manually copying or compiling modules, the dependency database may be out of date.

```bash
# Rebuild the module dependency database for the current kernel
sudo depmod -a

# Rebuild for a specific kernel version
sudo depmod -a 6.8.0-52-generic

# Force rebuild even if timestamps suggest it is current
sudo depmod -ae

# Check for errors in the dependency file
sudo depmod -n | grep -i error
```

## Summary Diagnostic Flow

When you encounter a missing module error, work through this sequence:

1. Check `dmesg` and `journalctl` for the exact error.
2. Search for the module file with `find /lib/modules/$(uname -r)/ -name "*.ko*"`.
3. If missing, check `/boot/config-$(uname -r)` to see if it was compiled out.
4. Install `linux-modules-extra-$(uname -r)` and try again.
5. Check for blacklisting in `/etc/modprobe.d/`.
6. Check for dependency issues with `modinfo -F depends`.
7. Verify version compatibility with `modinfo | grep vermagic`.
8. Run `sudo depmod -a` to rebuild the dependency database.
9. Rebuild initramfs if the module is needed at early boot.

Most missing module issues on Ubuntu are resolved by installing the `linux-modules-extra` package, as it contains drivers that were separated from the main package to reduce install size.
