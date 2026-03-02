# How to Configure initramfs on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Kernel, Boot, System Administration, initramfs

Description: Configure initramfs on Ubuntu to customize the early boot environment, add drivers, scripts, and control what loads before the root filesystem mounts.

---

The initramfs (initial RAM filesystem) is a temporary root filesystem that the Linux kernel mounts during early boot before the real root filesystem becomes available. Understanding and configuring it is essential when you need custom drivers at boot time, encrypted root filesystems, or specialized boot sequences.

## What initramfs Does

When the kernel boots, it needs certain drivers and tools available before it can mount the actual root filesystem. The initramfs handles this:

1. Kernel loads and decompresses initramfs into memory
2. Kernel mounts initramfs as a temporary root filesystem
3. Init scripts in initramfs load necessary drivers (storage controllers, RAID, LVM, encryption)
4. The real root filesystem gets mounted
5. Control transfers from initramfs to the real system's init (systemd)

On Ubuntu, the initramfs is stored as a compressed cpio archive at `/boot/initrd.img-<kernel-version>`.

## Inspecting the Current initramfs

Before configuring anything, understand what's currently in your initramfs:

```bash
# List kernel versions with their initramfs files
ls -lh /boot/initrd.img-*

# List contents of the current initramfs
lsinitramfs /boot/initrd.img-$(uname -r)

# List and grep for specific content
lsinitramfs /boot/initrd.img-$(uname -r) | grep modules

# Extract initramfs to examine in detail
mkdir /tmp/initramfs-extract
cd /tmp/initramfs-extract

# Initramfs may be split into multiple sections (microcode + main)
# Use unmkinitramfs for proper extraction
unmkinitramfs /boot/initrd.img-$(uname -r) /tmp/initramfs-extract/

ls /tmp/initramfs-extract/
```

## The update-initramfs Tool

Ubuntu provides `update-initramfs` to manage initramfs images:

```bash
# Update initramfs for the currently running kernel
sudo update-initramfs -u

# Update for a specific kernel version
sudo update-initramfs -u -k 6.8.0-51-generic

# Update for all installed kernels
sudo update-initramfs -u -k all

# Create a new initramfs (used after kernel install)
sudo update-initramfs -c -k $(uname -r)

# Delete an old initramfs
sudo update-initramfs -d -k 6.5.0-44-generic
```

The `-v` flag gives verbose output useful for troubleshooting:

```bash
sudo update-initramfs -u -v 2>&1 | less
```

## Configuration Files

### /etc/initramfs-tools/initramfs.conf

The main configuration file:

```bash
sudo nano /etc/initramfs-tools/initramfs.conf
```

Key settings:

```bash
# Boot type: most and dep are common
# most = include most modules
# dep = only include modules needed to boot this system
# list = only include modules listed in modules file
MODULES=dep

# Compression algorithm for the initramfs image
# xz gives best compression, lz4 gives fastest boot
# Options: gzip, bzip2, lz4, lzma, lzop, xz, zstd
COMPRESS=lz4

# Include NFS support (for network root filesystems)
BOOT=local

# Network device drivers for network boot
# DEVICE=eth0

# NFS root for diskless systems
# NFSROOT=auto
```

### /etc/initramfs-tools/modules

List modules that must be included in the initramfs:

```bash
sudo nano /etc/initramfs-tools/modules
```

```bash
# Each line is a module name
# Comments start with #

# Include virtio modules for KVM VMs
virtio
virtio_pci
virtio_blk
virtio_net

# Include specific filesystem drivers
ext4
xfs

# Include USB storage support for systems that boot from USB
usb_storage
uas

# Include NVMe driver for NVMe SSDs
nvme
nvme_core
```

After editing this file, run `update-initramfs -u` to apply changes.

### /etc/initramfs-tools/conf.d/

Drop-in configuration files for modular configuration:

```bash
# Create a custom configuration snippet
sudo nano /etc/initramfs-tools/conf.d/resume

# Content for enabling hibernate/resume
RESUME=/dev/sda3
# or
RESUME=UUID=your-swap-partition-uuid
```

```bash
# Another example - set compression
sudo nano /etc/initramfs-tools/conf.d/compression
```

```bash
# Override compression from main config
COMPRESS=zstd
```

## Adding Custom Scripts to initramfs

initramfs-tools uses a hook system for adding scripts and files. Hooks run during initramfs generation. Scripts run during boot.

### Hook Scripts

Hooks are stored in `/etc/initramfs-tools/hooks/` and run during `update-initramfs`:

```bash
sudo nano /etc/initramfs-tools/hooks/my-custom-hook
```

```bash
#!/bin/sh
# Hook to include a custom binary in initramfs

PREREQ=""
prereqs()
{
    echo "$PREREQ"
}

case $1 in
    prereqs)
        prereqs
        exit 0
        ;;
esac

. /usr/share/initramfs-tools/hook-functions

# Copy a binary and its dependencies into the initramfs
copy_exec /usr/bin/myprogram /bin

# Copy a library
copy_file library /usr/lib/x86_64-linux-gnu/libmylib.so.1

# Copy a configuration file
copy_file config /etc/myprogram.conf /etc
```

Make the hook executable:

```bash
sudo chmod +x /etc/initramfs-tools/hooks/my-custom-hook
```

### Boot Scripts (init-premount, local-premount, etc.)

Scripts that run during boot are organized by phase:

```bash
# Phases available:
# init-top      - runs first thing after init
# init-premount - before any filesystem mounting
# local-top     - before mounting local filesystems
# local-premount - just before mounting root
# local-bottom  - just after mounting root
# init-bottom   - last stage before pivot_root

sudo nano /etc/initramfs-tools/scripts/local-top/my-boot-script
```

```bash
#!/bin/sh
# Script to run before local root filesystem mounts

PREREQ=""
prereqs()
{
    echo "$PREREQ"
}

case $1 in
    prereqs)
        prereqs
        exit 0
        ;;
esac

# Your custom boot logic here
# Example: load a kernel module
modprobe my_special_module

# Example: set up a device
echo "Setting up custom device..."
```

Make it executable:

```bash
sudo chmod +x /etc/initramfs-tools/scripts/local-top/my-boot-script
sudo update-initramfs -u
```

## Handling Encrypted Root Filesystems

For LUKS-encrypted root filesystems, initramfs must include the decryption tooling:

```bash
# Install cryptsetup
sudo apt install cryptsetup

# The cryptsetup-initramfs package adds hooks automatically
sudo apt install cryptsetup-initramfs

# Configure the encrypted device
sudo nano /etc/crypttab
```

```bash
# Format: name  source-device  key-file  options
# dm_crypt-0  UUID=your-uuid  none  luks,discard
```

The cryptsetup hooks will automatically include the necessary tools in the initramfs when you run `update-initramfs`.

## Configuring LVM in initramfs

For systems with root on LVM:

```bash
# Install lvm2 (includes initramfs hooks)
sudo apt install lvm2

# Verify the hook is present
ls /usr/share/initramfs-tools/hooks/ | grep lvm

# Rebuild initramfs to include LVM support
sudo update-initramfs -u
```

## Tuning initramfs Size

Large initramfs files slow down boot. Several strategies to reduce size:

```bash
# Use better compression
sudo nano /etc/initramfs-tools/initramfs.conf
# Set: COMPRESS=lz4  (fastest boot) or COMPRESS=xz (smallest size)

# Use dep mode (only include needed modules)
# Set: MODULES=dep

# Check current initramfs size
ls -lh /boot/initrd.img-$(uname -r)

# Compare sizes after changes
sudo update-initramfs -u
ls -lh /boot/initrd.img-$(uname -r)
```

## Debugging initramfs Boot Issues

If the system fails to boot due to initramfs issues, you can debug interactively:

**From the initramfs shell:**
When boot fails, Ubuntu drops you to an initramfs shell. From there:

```bash
# List available block devices
ls /dev/sd* /dev/nvme* /dev/vd*

# Try to manually mount root
mount /dev/sda1 /root

# Check what modules are loaded
lsmod

# Load a missing module manually
modprobe ext4

# Check dmesg for errors
dmesg | tail -50

# Exit and try to continue boot
exit
```

**Boot with initramfs debugging enabled:**

Add to kernel command line in GRUB:

```bash
# Edit /etc/default/grub temporarily
GRUB_CMDLINE_LINUX_DEFAULT="quiet splash break=premount"
# break=premount drops to shell before premount scripts run
# break=mount drops to shell before mounting root
# break=bottom drops to shell just before pivot_root
```

## Verifying Changes

After any configuration change, rebuild and verify:

```bash
# Rebuild initramfs
sudo update-initramfs -u -v 2>&1 | tee /tmp/initramfs-build.log

# Verify your module is included
lsinitramfs /boot/initrd.img-$(uname -r) | grep your_module

# Check size
ls -lh /boot/initrd.img-$(uname -r)

# Verify GRUB knows about the new initramfs
grep initrd /boot/grub/grub.cfg | head -5
```

Always test configuration changes on non-production systems first. A broken initramfs means a system that won't boot, so keeping a working initramfs backup is prudent before making significant changes.
