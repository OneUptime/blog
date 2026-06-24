# How to Load the 8021q Kernel Module for VLAN Support

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Linux, VLAN, 8021q, Kernel Modules, Networking, 802.1Q

Description: Load and persist the 8021q kernel module on Linux to enable 802.1Q VLAN tagging support for VLAN subinterface creation.

## Introduction

The `8021q` kernel module provides 802.1Q VLAN tagging support in the Linux kernel when VLAN support is built as a loadable module. If VLAN support is built directly into the kernel, there is no module to load, but you can still create VLAN subinterfaces. On many modern distributions, the module loads automatically when you create a VLAN interface, but it can also be loaded manually or configured to load at boot.

## Check if 8021q is Already Loaded

```bash
# Check current module state

lsmod | grep 8021q

# If the command returns output, the module is loaded:
# 8021q                  36864  0
# garp                   16384  1 8021q
# mrp                    20480  1 8021q

# If no output, the module is not currently loaded.
# VLAN support may still be built into the kernel instead of shipped as a module.
```

## Load the Module Manually

```bash
# Load the 8021q module immediately
modprobe 8021q

# Verify it loaded successfully
lsmod | grep 8021q

# Check the module's information
modinfo 8021q
```

## Load the Module at Boot

### Method 1: /etc/modules-load.d/ (systemd systems)

```bash
# Create a configuration file to load 8021q at boot
echo "8021q" > /etc/modules-load.d/8021q.conf

# Verify the file
cat /etc/modules-load.d/8021q.conf
```

### Method 2: /etc/modules (Debian/Ubuntu legacy)

```bash
# Add 8021q to the modules file
echo "8021q" >> /etc/modules
```

### Method 3: /etc/modprobe.d/ for Module Options (Optional)

```bash
# /etc/modprobe.d/*.conf is for module parameters or aliases.
# It does not load 8021q by itself, and 8021q typically has no extra parameters.
modinfo -p 8021q
```

## Verify the Module Loads at Boot

```bash
# Check that systemd-modules-load service will load it
systemctl status systemd-modules-load.service

# Manually trigger module loading from the config
systemctl start systemd-modules-load.service
lsmod | grep 8021q
```

## Module Dependencies

The `8021q` module depends on `garp` and `mrp`. These are loaded automatically as dependencies:

```bash
# View module dependencies
modinfo 8021q | grep depends
# depends: garp,mrp

# All dependencies are loaded automatically by modprobe
```

## Test VLAN Creation After Loading

```bash
# After loading the module, create a test VLAN to verify it works
ip link add link eth0 name eth0.100 type vlan id 100

# If the command succeeds, the module is functioning correctly
ip -d link show eth0.100
# Should show: vlan protocol 802.1Q id 100

# Clean up the test
ip link delete eth0.100
```

## Troubleshoot Module Loading Failures

```bash
# Check kernel log for module errors
dmesg | grep 8021q

# Check if module file exists
find /lib/modules/$(uname -r) -name "8021q*"

# If the module doesn't exist, VLAN support may be built into the kernel instead.
# Otherwise, reinstall or verify the kernel modules package for your running kernel.
```

## Conclusion

The `8021q` kernel module is required for VLAN support on Linux only when VLAN support is built as a module. Load it with `modprobe 8021q` and make it persistent by adding `8021q` to `/etc/modules-load.d/8021q.conf`. On modern distributions, the module often loads automatically when you first create a VLAN interface, but explicitly loading and persisting it ensures VLAN support is always available when the feature is modular.
