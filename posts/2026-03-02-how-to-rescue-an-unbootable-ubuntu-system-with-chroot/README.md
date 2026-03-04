# How to Rescue an Unbootable Ubuntu System with chroot

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, System Recovery, Chroot, Boot, Troubleshooting

Description: A complete guide to using chroot from a live Ubuntu USB to repair an unbootable system, covering mounting, entering the chroot environment, and performing common repairs.

---

`chroot` (change root) lets you run commands as if a different directory is the root filesystem. When Ubuntu won't boot, you can mount the installed system from a live USB and use chroot to run repair commands - reinstall packages, fix bootloaders, regenerate configuration files - without needing the system to actually boot.

This is one of the most powerful recovery techniques available and solves a wide range of boot problems.

## When to Use chroot Recovery

Use this approach when:
- GRUB is broken and the system won't boot at all
- A kernel update failed and broke booting
- Critical system files were deleted or corrupted
- Package installation failed and left the system in a broken state
- You need to reset a forgotten root password
- Network configuration is broken and you can't log in remotely

## Boot from a Live USB

Download an Ubuntu ISO (same major version as the installed system if possible) and create a bootable USB. Boot from it and choose "Try Ubuntu without installing."

Open a terminal once the desktop loads.

## Step 1: Identify the Installed System's Partitions

```bash
# List all disks and partitions with filesystem info
lsblk -f

# More detailed view
sudo fdisk -l

# Show UUIDs and types
sudo blkid
```

You're looking for:
- The root partition: ext4, usually the largest (e.g., `/dev/sda2`)
- The boot partition if separate: ext4, around 512MB-1GB (e.g., `/dev/sda3`)
- The EFI partition if UEFI: FAT32, 100-512MB (e.g., `/dev/sda1`)

A typical Ubuntu with LVM might show:
- `/dev/sda1` - FAT32 EFI partition
- `/dev/sda2` - ext4 boot partition
- `/dev/sda3` - LVM physical volume containing root

## Step 2: Mount the Root Filesystem

```bash
# Create mount point
sudo mkdir -p /mnt/ubuntu

# Mount root partition
sudo mount /dev/sda2 /mnt/ubuntu

# Verify it looks right - should see standard Linux directories
ls /mnt/ubuntu
# Should show: bin boot dev etc home lib media mnt opt proc root run srv sys tmp usr var
```

If using LVM:

```bash
# Activate LVM volume groups
sudo vgchange -ay

# List logical volumes
sudo lvs

# Mount the logical volume
sudo mount /dev/ubuntu-vg/ubuntu-lv /mnt/ubuntu
```

## Step 3: Mount Required Virtual Filesystems

These provide access to device files, process information, and kernel interfaces that programs need:

```bash
# Bind mount /dev (device files)
sudo mount --bind /dev /mnt/ubuntu/dev

# Bind mount /dev/pts (pseudo-terminal devices)
sudo mount --bind /dev/pts /mnt/ubuntu/dev/pts

# Bind mount /proc (process and kernel info)
sudo mount --bind /proc /mnt/ubuntu/proc

# Bind mount /sys (sysfs, hardware info)
sudo mount --bind /sys /mnt/ubuntu/sys
```

For UEFI systems, also mount the EFI variables filesystem:

```bash
sudo mount --bind /sys/firmware/efi/efivars /mnt/ubuntu/sys/firmware/efi/efivars
```

Mount the EFI partition:

```bash
sudo mount /dev/sda1 /mnt/ubuntu/boot/efi
```

Mount a separate /boot partition if you have one:

```bash
sudo mount /dev/sda3 /mnt/ubuntu/boot
```

## Step 4: Enter the chroot

```bash
sudo chroot /mnt/ubuntu
```

Your prompt changes. You're now running commands inside the broken system. Commands like `apt`, `grub-install`, `update-grub`, `update-initramfs` all work as if you had booted normally.

Set up a minimal environment:

```bash
# Make sure basic environment variables are set
export HOME=/root
export LC_ALL=C

# Update package lists (requires network - live USB usually has network)
apt update
```

## Common Repairs from chroot

### Fix GRUB

```bash
# Reinstall GRUB (UEFI)
grub-install --target=x86_64-efi --efi-directory=/boot/efi --bootloader-id=ubuntu

# Reinstall GRUB (Legacy BIOS) - target the disk, not a partition
grub-install /dev/sda

# Regenerate GRUB configuration
update-grub
```

### Regenerate initramfs

```bash
# For all installed kernels
update-initramfs -u -k all

# For a specific kernel version
update-initramfs -u -k 6.8.0-45-generic

# Force complete regeneration
update-initramfs -c -k all
```

### Fix Broken Package Installation

```bash
# Fix broken dpkg state
dpkg --configure -a

# Fix broken package dependencies
apt install -f

# Reinstall a specific broken package
apt install --reinstall grub-efi-amd64

# If apt itself is broken, try dpkg directly
dpkg -i /var/cache/apt/archives/*.deb
```

### Reset Root Password

```bash
# Set a new root password
passwd root

# Reset a user's password
passwd username
```

### Fix Network Configuration

```bash
# Reinstall netplan
apt install --reinstall netplan.io

# Reset NetworkManager
apt install --reinstall network-manager

# Edit a netplan config
nano /etc/netplan/01-netcfg.yaml
netplan apply
```

### Remove a Broken Kernel

```bash
# List installed kernels
dpkg --list | grep linux-image

# Remove a specific kernel that's causing problems
apt remove linux-image-6.8.0-50-generic

# Clean up headers too
apt remove linux-headers-6.8.0-50-generic

# Update GRUB after removal
update-grub
```

### Re-enable a Disabled Service

```bash
# Check failed units
systemctl list-units --failed

# Re-enable a disabled service
systemctl enable ssh

# Unmask a masked service
systemctl unmask networkd-dispatcher
systemctl enable networkd-dispatcher
```

## Step 5: Exit and Unmount

When you're done with repairs, exit chroot and unmount everything cleanly:

```bash
# Exit the chroot
exit
```

Back in the live USB environment:

```bash
# Unmount in reverse order (children before parents)

# Unmount EFI vars (UEFI systems)
sudo umount /mnt/ubuntu/sys/firmware/efi/efivars

# Unmount virtual filesystems
sudo umount /mnt/ubuntu/sys
sudo umount /mnt/ubuntu/proc
sudo umount /mnt/ubuntu/dev/pts
sudo umount /mnt/ubuntu/dev

# Unmount EFI partition (UEFI)
sudo umount /mnt/ubuntu/boot/efi

# Unmount separate boot partition if present
sudo umount /mnt/ubuntu/boot

# Unmount root
sudo umount /mnt/ubuntu

# Reboot
sudo reboot
```

## Troubleshooting chroot Issues

### "chroot: failed to run command '/bin/bash': Exec format error"

The live USB architecture doesn't match the installed system. A 32-bit live USB can't chroot into a 64-bit system. Use a matching architecture.

### Commands Not Found Inside chroot

The PATH may not be set correctly:

```bash
export PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin
```

### Package Installation Fails with "No space left on device"

The live USB system's tmpfs might be full. Mount a real partition to `/tmp` inside the chroot:

```bash
# From outside chroot
sudo mount --bind /tmp /mnt/ubuntu/tmp
```

### Network Not Available Inside chroot

Copy the DNS resolver config:

```bash
# From outside chroot
sudo cp /etc/resolv.conf /mnt/ubuntu/etc/resolv.conf
```

Then `apt update` and package downloads should work.

chroot is a versatile tool that makes most system recovery tasks straightforward. The pattern is always the same: mount the broken system, bind the virtual filesystems, chroot in, make repairs, exit, unmount.
