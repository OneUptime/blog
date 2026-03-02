# How to Load and Unload Kernel Modules on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Linux Kernel, System Administration, Drivers, Hardware

Description: Learn how to load, unload, and manage Linux kernel modules on Ubuntu, including how to pass parameters, configure persistent loading, and troubleshoot module issues.

---

Kernel modules are pieces of code that can be loaded into and removed from the Linux kernel dynamically - without rebooting. Drivers for hardware devices, filesystem support, network protocols, and kernel features are often implemented as modules. Understanding how to manage them is essential for hardware troubleshooting, performance tuning, and system configuration.

## Listing Loaded Modules

```bash
# List all currently loaded kernel modules
lsmod

# lsmod reads from /proc/modules
cat /proc/modules | head -10
```

`lsmod` output:

```
Module                  Size  Used by
overlay               139264  23
br_netfilter           28672  0
bridge                290816  1 br_netfilter
stp                    16384  1 bridge
llc                    16384  2 stp,bridge
nf_conntrack_netlink   49152  0
nf_nat                 45056  2 nf_conntrack_netlink
nf_conntrack          172032  4 nf_nat,nf_conntrack_netlink
```

Columns:
- **Module** - Module name
- **Size** - Memory used by the module
- **Used by** - Reference count and which modules depend on this one

A "Used by" count of 0 means the module is loaded but nothing currently depends on it.

## Getting Module Information

```bash
# Show info about a loaded module
modinfo overlay

# Show info about a module file (not necessarily loaded)
modinfo /lib/modules/$(uname -r)/kernel/drivers/net/ethernet/intel/e1000e/e1000e.ko

# Show parameters a module accepts
modinfo -p e1000e

# Show module dependencies
modinfo --field=depends e1000e
```

`modinfo` output:

```
filename:       /lib/modules/5.15.0-91-generic/kernel/fs/overlayfs/overlay.ko.zst
author:         Miklos Szeredi <miklos@szeredi.hu>
description:    Overlay filesystem
license:        GPL
...
parm:           redirect_dir:Enable upper layer directory... (bool)
parm:           index:Use mounter directory... (bool)
```

## Loading Modules

### modprobe (Recommended)

`modprobe` is the preferred tool because it handles dependencies automatically:

```bash
# Load a module
sudo modprobe <module_name>

# Load with parameters
sudo modprobe e1000e EEE=1

# Load and show verbose output
sudo modprobe -v e1000e

# Dry run - show what would happen without doing it
sudo modprobe --dry-run e1000e
```

When you load a module with `modprobe`, it reads `/lib/modules/$(uname -r)/modules.dep` to determine dependencies and loads them in the correct order.

### insmod (Manual Load)

`insmod` loads a specific module file without handling dependencies:

```bash
# Load a specific .ko file
sudo insmod /lib/modules/$(uname -r)/kernel/net/bridge/bridge.ko

# This is lower-level than modprobe and won't resolve dependencies
```

Use `modprobe` unless you have a specific reason to use `insmod`.

## Unloading Modules

### rmmod

```bash
# Remove a loaded module
sudo rmmod <module_name>

# Force remove (use with caution - can cause instability)
sudo rmmod --force <module_name>
```

Removing a module fails if anything depends on it or if it's currently in use:

```bash
# Error: module is in use
sudo rmmod bridge
# rmmod: ERROR: Module bridge is in use by: br_netfilter

# Must remove dependent module first
sudo rmmod br_netfilter
sudo rmmod bridge
```

### modprobe -r (Recommended)

`modprobe -r` removes a module and unused dependencies:

```bash
# Remove module and dependencies that are no longer needed
sudo modprobe -r bridge

# Verbose removal
sudo modprobe -rv bridge
```

## Finding Available Modules

```bash
# Find all available modules for the running kernel
find /lib/modules/$(uname -r) -name "*.ko*" | head -20

# Search by name
find /lib/modules/$(uname -r) -name "*bluetooth*"

# More targeted search
modprobe --show-depends btusb 2>/dev/null

# List modules matching a pattern
find /lib/modules/$(uname -r) -name "*.ko.zst" | xargs -I{} basename {} .ko.zst | grep "^e1000"
```

## Module Parameters

Many modules accept parameters that change their behavior:

```bash
# View available parameters
modinfo -p ath9k

# Load with parameters
sudo modprobe ath9k nohwcrypt=1

# Check current parameter values for a loaded module
cat /sys/module/ath9k/parameters/nohwcrypt

# List all parameters of a loaded module
ls /sys/module/<module_name>/parameters/
cat /sys/module/ath9k/parameters/*
```

## Persistent Module Loading

Modules loaded with `modprobe` are not persistent across reboots. To load a module automatically at boot:

### Method 1: /etc/modules

```bash
# Simple list of modules to load at boot
sudo nano /etc/modules
```

Add module names, one per line:

```
# Load at boot
br_netfilter
overlay
dm_crypt
```

### Method 2: /etc/modules-load.d/

More organized approach, separate file per module or group:

```bash
# Create a file for network modules
sudo nano /etc/modules-load.d/network.conf
```

```
# Network modules
br_netfilter
8021q
bonding
```

```bash
# Create a file for storage modules
sudo nano /etc/modules-load.d/storage.conf
```

```
# Storage modules
dm_crypt
dm_multipath
```

### Method 3: /etc/modprobe.d/ for Parameters

Use `/etc/modprobe.d/` to set persistent parameters and options:

```bash
# Set module parameters permanently
sudo nano /etc/modprobe.d/network.conf
```

```
# Load e1000e with EEE disabled
options e1000e EEE=0

# Load ath9k without hardware crypto
options ath9k nohwcrypt=1

# Alias for module
alias net-pf-10 ipv6
```

Files in `/etc/modprobe.d/` are read by `modprobe` whenever a module is loaded, regardless of whether it's loaded manually or automatically.

## Blacklisting Modules

Prevent a module from loading, even if the system tries to load it:

```bash
# Create a blacklist file
sudo nano /etc/modprobe.d/blacklist-custom.conf
```

```
# Blacklist Bluetooth (if not used)
blacklist bluetooth
blacklist btusb
blacklist btrtl

# Blacklist nouveau in favor of nvidia
blacklist nouveau
```

For hardware where the wrong driver is auto-loaded:

```bash
# Blacklist and block automatic loading
blacklist pcspkr

# 'install' trick to completely prevent loading
# (more reliable than blacklist for some modules)
install pcspkr /bin/false
```

The difference:
- `blacklist` prevents automatic loading via udev but can still be loaded manually
- `install <module> /bin/false` prevents all loading including manual `modprobe`

Apply blacklist changes:

```bash
# Update initramfs to include new blacklists
sudo update-initramfs -u

# Reboot for changes to take effect
# Or unload the module manually now
sudo modprobe -r pcspkr
```

## Diagnosing Module Issues

### Module Failed to Load

```bash
# Check kernel messages for load errors
dmesg | grep -i "module\|error" | tail -20

# Try loading with verbose output
sudo modprobe -v problematic_module

# Check for dependency issues
modprobe --show-depends problematic_module
```

### Finding Which Module Drives a Device

```bash
# For a PCI device
lspci -k | grep -A 3 "Network controller"

# For a USB device
lsusb -v | grep -A 5 "driver"

# For any device in /sys
udevadm info -a /sys/bus/pci/devices/0000:00:1f.6/
```

### Module Loading Order Issues

If a module must load before another:

```bash
# Specify load order with explicit dependency
sudo nano /etc/modprobe.d/ordering.conf
```

```
# softdep: soft dependency (preferred order but not enforced)
softdep bridge pre: stp

# Or use post-install hooks
install mymodule /sbin/modprobe --ignore-install mymodule; /usr/local/bin/post-load-script.sh
```

## DKMS - Dynamic Kernel Module Support

For modules that need to be compiled against each kernel (like GPU drivers, ZFS, VirtualBox additions):

```bash
# Install DKMS
sudo apt install dkms -y

# List DKMS modules
dkms status

# DKMS automatically recompiles modules when a new kernel is installed
# Rebuild manually for a specific kernel
sudo dkms autoinstall -k $(uname -r)
```

When you install a new kernel, DKMS recompiles all registered modules for the new kernel version during boot.

## Checking Module Signatures

For systems with Secure Boot:

```bash
# Check if a module is signed
modinfo <module> | grep -i "sig\|signer"

# Check if signature verification is enforced
cat /proc/sys/kernel/module_sig_enforce
```

If `module_sig_enforce` is 1, only signed modules can be loaded. You'll need to sign custom modules:

```bash
# Sign a custom module with your MOK key
sudo /usr/src/linux-headers-$(uname -r)/scripts/sign-file sha256 \
  /path/to/mok.priv /path/to/mok.der mymodule.ko
```

Managing kernel modules is a fundamental Linux skill. Whether you're adding a hardware driver, enabling a kernel feature, or troubleshooting a device that's not working, the combination of `lsmod`, `modinfo`, `modprobe`, and `/etc/modprobe.d/` handles virtually all module management scenarios.
