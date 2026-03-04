# How to Use the RHEL Installation Media for System Rescue

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Rescue, Recovery, Boot, Installation Media, Linux

Description: Learn how to use the RHEL installation media to rescue a system that cannot boot, repair filesystems, and recover data.

---

When a RHEL system cannot boot due to filesystem corruption, misconfigured bootloader, or other critical issues, the RHEL installation media provides a rescue environment for repairs. This guide covers booting into rescue mode and performing common recovery tasks.

## Prerequisites

- RHEL installation ISO (USB drive or virtual media)
- Physical or console access to the system

## Booting into Rescue Mode

1. Insert the RHEL installation media and boot from it
2. At the boot menu, select **Troubleshooting**
3. Select **Rescue a Red Hat Enterprise Linux system**
4. The rescue environment boots a minimal Linux system

## Automatic System Detection

The rescue mode attempts to find your existing RHEL installation and mount it under `/mnt/sysroot`. You are prompted with three options:

- **Continue** - Mount the system read-write (for making changes)
- **Read-only** - Mount the system read-only (for inspection)
- **Skip** - Do not mount (for manual recovery)

Select **Continue** for most repair tasks.

## Accessing Your Installed System

After the rescue environment mounts your system:

```bash
chroot /mnt/sysroot
```

This changes your root to the installed system, giving you access to all installed commands and configuration.

## Repairing the Bootloader

### Reinstalling GRUB2

For BIOS systems:

```bash
chroot /mnt/sysroot
grub2-install /dev/sda
grub2-mkconfig -o /boot/grub2/grub.cfg
```

For UEFI systems:

```bash
chroot /mnt/sysroot
dnf reinstall grub2-efi-x64 shim-x64
grub2-mkconfig -o /boot/efi/EFI/redhat/grub.cfg
```

## Rebuilding initramfs

```bash
chroot /mnt/sysroot
dracut --force
```

## Repairing Filesystems

Exit the chroot first if active:

```bash
exit
```

Unmount the filesystem:

```bash
umount /mnt/sysroot
```

Run filesystem check:

```bash
# For XFS (default on RHEL)
xfs_repair /dev/sda2

# For ext4
e2fsck -f /dev/sda2
```

Remount after repair:

```bash
mount /dev/sda2 /mnt/sysroot
```

## Resetting the Root Password

```bash
chroot /mnt/sysroot
passwd root
```

Enter the new password when prompted.

If SELinux is enforcing, relabel the filesystem:

```bash
touch /.autorelabel
```

Exit and reboot:

```bash
exit
reboot
```

## Recovering Data

If the system cannot be repaired, copy critical data to external media:

```bash
# Mount a USB drive
mkdir /mnt/usb
mount /dev/sdb1 /mnt/usb

# Copy data
cp -a /mnt/sysroot/home /mnt/usb/
cp -a /mnt/sysroot/etc /mnt/usb/

# Unmount
umount /mnt/usb
```

## Repairing LVM Volumes

If the system uses LVM:

```bash
# Scan for volume groups
vgscan
vgchange -ay

# List logical volumes
lvs

# Mount the root volume
mount /dev/mapper/rhel-root /mnt/sysroot
```

## Repairing fstab

If a bad fstab entry prevents booting:

```bash
chroot /mnt/sysroot
vi /etc/fstab
```

Comment out or fix the problematic entry.

## Repairing SELinux Issues

If SELinux prevents booting:

```bash
chroot /mnt/sysroot

# Temporarily set SELinux to permissive
sed -i 's/SELINUX=enforcing/SELINUX=permissive/' /etc/selinux/config

# Or trigger a full relabel on next boot
touch /.autorelabel
```

## Network Access in Rescue Mode

If you need network access in the rescue environment:

```bash
# Start networking
dhclient
```

## Exiting Rescue Mode

```bash
exit  # Exit chroot if active
reboot
```

Remove the installation media before the system reboots.

## Conclusion

The RHEL installation media is an essential recovery tool. Use rescue mode to repair the bootloader, rebuild initramfs, fix filesystems, reset passwords, and recover data. Keep a copy of the installation ISO accessible for emergencies.
