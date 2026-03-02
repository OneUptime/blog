# How to Create Device Blacklists for Kernel Modules on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Kernel, Modules, Security, System Administration

Description: Configure kernel module blacklists on Ubuntu to prevent specific drivers from loading, covering blacklist files, install overrides, and initramfs integration.

---

Kernel module blacklisting tells Ubuntu not to automatically load specific drivers. You might need this when the kernel loads a generic driver for your hardware but you want to use a vendor-supplied one instead, when a buggy module causes system instability, or when you need to prevent a security-sensitive module from loading on certain machines. Ubuntu provides several mechanisms for this, with different levels of enforcement.

## Understanding How Module Loading Works

When the kernel boots, `udev` detects hardware and uses modalias matching to determine which module to load for each device. The `modprobe` tool loads modules along with their dependencies. Blacklisting intercepts this process and tells the system to skip specific modules.

Two mechanisms exist:
- **`blacklist`** - prevents automatic loading via `udev`, but the module can still be manually loaded with `modprobe`
- **`install modulename /bin/false`** - completely prevents loading, even with explicit `modprobe`

## Finding the Module to Blacklist

Before blacklisting, identify the exact module name.

```bash
# List currently loaded modules
lsmod

# Find which module handles a specific PCI device
lspci -k | grep -A3 "Ethernet\|Network\|VGA"
# Look for "Kernel driver in use:" field

# Find the module for a USB device
lsusb
udevadm info /sys/class/net/eth0 | grep DRIVER

# Get the full module name
modinfo nouveau | grep "^filename"
```

## Creating a Blacklist File

Blacklist configuration files live in `/etc/modprobe.d/`. Each file uses the `.conf` extension.

```bash
# Create a new blacklist file
sudo nano /etc/modprobe.d/blacklist-custom.conf
```

```bash
# /etc/modprobe.d/blacklist-custom.conf

# Prevent the nouveau (open-source NVIDIA) driver from loading
# Use this when running the proprietary nvidia driver instead
blacklist nouveau
blacklist lbm-nouveau

# Prevent the old Realtek driver when using vendor driver
blacklist r8169

# Prevent PC speaker beeping
blacklist pcspkr
blacklist snd_pcsp

# Prevent Intel WiFi module that conflicts with vendor driver
blacklist iwlwifi
```

After saving, update the initramfs so the blacklist takes effect at early boot.

```bash
sudo update-initramfs -u
```

## Using `install` to Completely Block a Module

The `blacklist` directive only stops automatic loading. If a script or service calls `modprobe`, the module will still load. To completely prevent loading:

```bash
sudo tee /etc/modprobe.d/disable-modules.conf << 'EOF'
# Completely disable the usb_storage module (prevents USB storage devices from working)
# Use this in high-security environments
install usb_storage /bin/false

# Completely disable FireWire/Thunderbolt DMA (security hardening)
install firewire-core /bin/false
install thunderbolt /bin/false

# Disable Bluetooth entirely
install bluetooth /bin/false
EOF

sudo update-initramfs -u
```

With `install modulename /bin/false`, attempting to load the module returns an error rather than silently skipping it.

```bash
# After applying install override:
sudo modprobe usb_storage
# modprobe: ERROR: could not insert 'usb_storage': Operation not permitted
```

## Blacklisting by Device ID

In some cases, you want to prevent a driver from loading only for a specific hardware variant while still loading it for others. This requires a more targeted approach using udev rules.

```bash
# Create a udev rule to ignore a specific PCI device
sudo tee /etc/udev/rules.d/70-blacklist-device.rules << 'EOF'
# Blacklist a specific PCI device by vendor/device ID
# This unbinds and prevents driver attachment for just this device
ACTION=="add", SUBSYSTEM=="pci", ATTRS{vendor}=="0x10de", ATTRS{device}=="0x1b80", RUN+="/bin/sh -c 'echo 1 > /sys/bus/pci/devices/$kernel/remove'"
EOF

sudo udevadm control --reload-rules
```

## System-Wide vs. Package-Provided Blacklists

Ubuntu ships some blacklists through packages in `/lib/modprobe.d/`. Your files in `/etc/modprobe.d/` override these.

```bash
# View all package-provided blacklists
ls /lib/modprobe.d/

# View your custom blacklists
ls /etc/modprobe.d/

# View a package blacklist
cat /lib/modprobe.d/blacklist*.conf

# Your /etc/modprobe.d/ entries take precedence
# If a package blacklists something you want loaded, create an override in /etc/modprobe.d/:
sudo tee /etc/modprobe.d/override-blacklist.conf << 'EOF'
# Override package blacklist - allow pcspkr to load
install pcspkr modprobe --ignore-install pcspkr
EOF
```

## Verifying the Blacklist Works

```bash
# Check if a module is currently blacklisted
grep -r "blacklist.*nouveau" /etc/modprobe.d/ /lib/modprobe.d/

# Try loading the blacklisted module (should be prevented or ignored)
sudo modprobe nouveau
# "blacklist" prevents automatic loading but not manual - this might still load it
# "install /bin/false" prevents both

# After reboot, verify the module is not loaded
lsmod | grep nouveau

# Check systemd journal for module loading attempts
sudo journalctl -k | grep "nouveau\|modprobe"
```

## Including Blacklists in Initramfs

The blacklist must be in initramfs to prevent modules from loading during the early boot phase.

```bash
# Rebuild initramfs after creating or modifying blacklist files
sudo update-initramfs -u

# Verify the blacklist file is included in initramfs
lsinitramfs /boot/initrd.img-$(uname -r) | grep modprobe.d

# For a specific kernel version
sudo update-initramfs -u -k 6.8.0-52-generic
```

## Security Hardening with Blacklists

For servers and kiosks, blacklisting unused modules reduces the attack surface.

```bash
sudo tee /etc/modprobe.d/hardening.conf << 'EOF'
# Security hardening - disable unused and potentially dangerous modules

# Disable unused filesystems
install cramfs /bin/false
install freevxfs /bin/false
install jffs2 /bin/false
install hfs /bin/false
install hfsplus /bin/false
install squashfs /bin/false
install udf /bin/false

# Disable uncommon network protocols
install dccp /bin/false
install sctp /bin/false
install rds /bin/false
install tipc /bin/false

# Disable Bluetooth (if not needed)
install bluetooth /bin/false
install btusb /bin/false

# Disable USB storage (for kiosk/ATM style machines)
# install usb_storage /bin/false  # uncomment if needed

# Disable firewire DMA (prevents DMA attacks via FireWire)
install firewire-core /bin/false
install ohci1394 /bin/false
EOF

sudo update-initramfs -u
```

This type of configuration aligns with CIS (Center for Internet Security) benchmarks for Ubuntu.

## Troubleshooting Blacklist Issues

### Module Still Loads After Blacklisting

```bash
# Check if the module is a dependency of another module
modinfo modulename | grep "^alias"
lsmod | grep modulename

# The module might be loaded by its dependency chain
# Blacklist both the module and what loads it
grep -r "alias.*modulename" /lib/modules/$(uname -r)/modules.alias
```

### Module Needed at Boot Cannot Be Blacklisted

If a module is a dependency for the root filesystem mount, blacklisting it will prevent boot.

```bash
# Check what requires the module
modprobe --show-depends ext4
# All of ext4's dependencies must be available at boot

# Check if a module is in the boot-critical path
lsinitramfs /boot/initrd.img-$(uname -r) | grep modulename
```

### Reverting a Blacklist

```bash
# Remove the blacklist entry
sudo nano /etc/modprobe.d/blacklist-custom.conf
# Delete or comment out the relevant line

# Rebuild initramfs
sudo update-initramfs -u

# Load the module manually to test without rebooting
sudo modprobe modulename

# Verify it loaded
lsmod | grep modulename
```

Blacklisting is a surgical tool - applied precisely, it resolves driver conflicts and hardens systems. Applied incorrectly, it can prevent devices from working. Always test changes before applying them to production systems, and keep a note of what you blacklisted and why.
