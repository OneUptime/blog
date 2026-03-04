# How to Fix GRUB2 'Error: Unknown Filesystem' Boot Failure on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, GRUB2, Boot, Troubleshooting, File System

Description: Fix the GRUB2 'error: unknown filesystem' boot failure on RHEL by reinstalling GRUB, repairing the boot partition, or fixing partition table issues.

---

The GRUB2 "error: unknown filesystem" message appears when GRUB cannot recognize the filesystem on the boot partition. This drops you into the GRUB rescue shell and prevents the system from booting.

## Diagnosing from the GRUB Rescue Shell

```bash
# At the grub rescue> prompt, list available drives
grub rescue> ls
# (hd0) (hd0,msdos1) (hd0,msdos2)

# Try each partition to find the boot filesystem
grub rescue> ls (hd0,msdos1)/
# If it returns "unknown filesystem", that partition has issues

# Find the partition with /boot content
grub rescue> ls (hd0,msdos1)/grub2/
# If this returns files, you found the boot partition
```

## Boot Into Rescue Mode

Since GRUB is broken, boot from the RHEL installation media.

```bash
# Boot from RHEL ISO/USB
# Select: Troubleshooting > Rescue a Red Hat Enterprise Linux system

# If rescue mode finds your installation:
chroot /mnt/sysroot
```

## Fix 1: Reinstall GRUB2

```bash
# For BIOS/MBR systems
sudo grub2-install /dev/sda

# For UEFI systems
sudo dnf reinstall grub2-efi-x64 shim-x64

# Regenerate the GRUB configuration
sudo grub2-mkconfig -o /boot/grub2/grub.cfg

# For UEFI, the config goes to a different location
sudo grub2-mkconfig -o /boot/efi/EFI/redhat/grub.cfg
```

## Fix 2: Repair the Boot Partition Filesystem

```bash
# Identify the boot partition
lsblk
# Look for the /boot mount point

# Unmount boot if mounted
umount /boot

# Check and repair the filesystem (usually ext4 for /boot)
fsck.ext4 -y /dev/sda1

# Remount
mount /boot
```

## Fix 3: Check the Partition Table

```bash
# View the partition table
fdisk -l /dev/sda

# Check for partition table corruption
gdisk -l /dev/sda   # for GPT
# or
fdisk -l /dev/sda   # for MBR

# Verify the boot flag is set on the correct partition
parted /dev/sda print
```

## Fix 4: Verify Filesystem Type Matches GRUB Modules

```bash
# GRUB needs the correct filesystem module
# List available GRUB modules
ls /boot/grub2/i386-pc/ | grep -E "xfs|ext"

# If the boot partition was converted to a different filesystem type
# GRUB may not have the required module
# Reinstalling GRUB resolves this
```

## After Fixing

```bash
# Exit chroot
exit

# Reboot
reboot
```

The most common cause is filesystem corruption on the /boot partition due to an unclean shutdown. Reinstalling GRUB2 and regenerating the configuration resolves most cases.
