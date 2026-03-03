# How to Repair a Broken Ubuntu Installation from a Live USB

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, System Recovery, Live USB, Troubleshooting

Description: How to use a Ubuntu Live USB to chroot into a broken installation and repair common issues like broken bootloaders, missing packages, and corrupt filesystems.

---

A broken Ubuntu installation does not always mean reinstalling from scratch. Most common failure modes - a corrupted bootloader, a bad package update, a misconfigured fstab - can be repaired by booting from a Live USB and chrooting into the damaged system. This post covers the process.

## What You Need

- A USB drive with Ubuntu Live media (same major version or close to the installed system is ideal)
- Physical or console access to the machine
- Knowledge of which disk your Ubuntu installation lives on

If you do not have a live USB handy, download the Ubuntu ISO from ubuntu.com and write it to a USB with `dd` from another machine:

```bash
# Write ISO to USB drive (replace /dev/sdX with your USB device)
# WARNING: This will erase the USB drive
sudo dd if=ubuntu-24.04-desktop-amd64.iso of=/dev/sdX bs=4M status=progress oflag=sync
```

## Booting the Live Environment

Insert the USB and boot the machine. Access the boot menu (usually F12, F2, or Esc during POST) and select the USB drive. Choose "Try Ubuntu" to enter the live desktop without installing.

Open a terminal in the live environment.

## Identifying the Broken Installation

Find your Ubuntu partitions:

```bash
# List all block devices
lsblk -f

# Or use fdisk
sudo fdisk -l
```

Look for partitions formatted as ext4 (or btrfs/xfs if you chose those) that are likely your root filesystem. Common layouts:
- Single partition: `/dev/sda1` or `/dev/nvme0n1p2`
- With separate EFI partition: EFI at `/dev/sda1` (vfat), root at `/dev/sda2`
- With LVM: you will see physical volumes that need to be activated

## Mounting the Installation

```bash
# Create a mount point
sudo mkdir -p /mnt/ubuntu

# Mount the root partition
sudo mount /dev/sda2 /mnt/ubuntu

# If you have a separate /boot partition, mount it too
sudo mount /dev/sda1 /mnt/ubuntu/boot

# For UEFI systems, mount the EFI partition
sudo mount /dev/sda1 /mnt/ubuntu/boot/efi
```

### If Using LVM

```bash
# Activate all volume groups
sudo vgchange -ay

# List logical volumes
sudo lvs

# Mount the root LV
sudo mount /dev/ubuntu-vg/ubuntu-lv /mnt/ubuntu
```

## Setting Up the Chroot Environment

For programs inside the chroot to work properly, you need to bind-mount several virtual filesystems:

```bash
# Bind mount essential virtual filesystems
sudo mount --bind /dev /mnt/ubuntu/dev
sudo mount --bind /dev/pts /mnt/ubuntu/dev/pts
sudo mount --bind /proc /mnt/ubuntu/proc
sudo mount --bind /sys /mnt/ubuntu/sys
sudo mount --bind /run /mnt/ubuntu/run

# Mount EFI variables if needed (for GRUB repair on UEFI systems)
sudo mount --bind /sys/firmware/efi/efivars /mnt/ubuntu/sys/firmware/efi/efivars
```

Now enter the chroot:

```bash
sudo chroot /mnt/ubuntu /bin/bash
```

Your prompt will change. You are now operating inside the broken Ubuntu installation.

```bash
# Verify you are in the right system
cat /etc/os-release

# Update the package list (requires network, which the live environment has)
apt update
```

## Repairing Common Issues

### Fixing a Broken GRUB Bootloader

GRUB corruption is one of the most common reasons a system won't boot:

```bash
# For BIOS/MBR systems
grub-install /dev/sda    # The disk, not a partition
update-grub

# For UEFI systems (EFI partition must be mounted at /boot/efi)
grub-install --target=x86_64-efi --efi-directory=/boot/efi --bootloader-id=ubuntu
update-grub
```

### Repairing Broken Packages

If the system stopped booting after a failed package update:

```bash
# Try to fix broken dependencies
apt --fix-broken install

# Reconfigure any partially installed packages
dpkg --configure -a

# Force reinstall a specific package if needed
apt install --reinstall package-name
```

If the package database is corrupt:

```bash
# Remove the package status cache and rebuild
rm /var/cache/apt/pkgcache.bin /var/cache/apt/srcpkgcache.bin
apt update
```

### Fixing a Corrupt /etc/fstab

If the system fails at boot with a filesystem mount error, the fstab may have incorrect entries:

```bash
# View the current fstab
cat /etc/fstab

# Get the UUIDs of all partitions to verify fstab entries
blkid

# Edit fstab if there are incorrect entries
nano /etc/fstab
```

A minimal fstab for a single-disk system looks like:

```text
# <file system>  <mount point>  <type>  <options>        <dump>  <pass>
UUID=xxxx-xxxx   /              ext4    errors=remount-ro  0       1
UUID=xxxx-xxxx   /boot/efi      vfat    umask=0077         0       1
```

### Resetting a Forgotten Root Password

```bash
# While in the chroot
passwd root

# Or reset another user's password
passwd username
```

### Fixing Filesystem Errors

If the filesystem itself is corrupt, you need to run fsck from outside the chroot. Exit first:

```bash
exit  # Exit chroot
sudo umount /mnt/ubuntu/proc
sudo umount /mnt/ubuntu/sys
sudo umount /mnt/ubuntu/dev/pts
sudo umount /mnt/ubuntu/dev
sudo umount /mnt/ubuntu

# Run filesystem check (partition must be unmounted)
sudo fsck -f /dev/sda2
```

Fsck will ask about every inconsistency it finds. Answer `y` to fix each one, or run `sudo fsck -fy /dev/sda2` to automatically answer yes to all.

### Recovering from a Failed Kernel Update

```bash
# Inside chroot - reinstall the kernel
apt install --reinstall linux-image-generic linux-headers-generic

# Update initramfs
update-initramfs -u -k all

# Regenerate GRUB config
update-grub
```

### Fixing Broken AppArmor or SELinux Policies

If the system panics due to security policy issues:

```bash
# Inside chroot - disable AppArmor temporarily
systemctl disable apparmor

# Or remove a specific problematic profile
rm /etc/apparmor.d/problematic-profile
```

## Restoring Network in Chroot

If you need to install packages from inside the chroot, you need the live environment's DNS:

```bash
# Copy the live system's resolv.conf into the chroot
cp /etc/resolv.conf /mnt/ubuntu/etc/resolv.conf
```

Do this before entering the chroot if you anticipate needing network access inside it.

## Cleaning Up and Rebooting

After making repairs, clean up properly:

```bash
# Exit chroot
exit

# Unmount everything in reverse order
sudo umount /mnt/ubuntu/sys/firmware/efi/efivars  # Only if mounted
sudo umount /mnt/ubuntu/dev/pts
sudo umount /mnt/ubuntu/dev
sudo umount /mnt/ubuntu/proc
sudo umount /mnt/ubuntu/sys
sudo umount /mnt/ubuntu/run
sudo umount /mnt/ubuntu/boot/efi  # If mounted
sudo umount /mnt/ubuntu/boot      # If mounted
sudo umount /mnt/ubuntu

# Reboot
sudo reboot
```

Remove the USB when the machine starts the reboot sequence so it boots from the internal drive.

## When Repair Is Not Enough

Some situations genuinely require a reinstall rather than a repair:
- Severe filesystem corruption that fsck cannot fix
- Encrypted volumes where you have lost the key
- Complete destruction of the partition table with no backups

Even in these cases, you may be able to recover your data from the live USB environment before reinstalling, by mounting the partition (even if damaged) and copying files to external storage.
