# How to Reset the GRUB Bootloader on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, GRUB, Boot, System Recovery, System Administration

Description: Learn how to reset and reinstall the GRUB bootloader on Ubuntu after corruption, failed updates, or dual-boot changes using a live USB environment and chroot recovery.

---

A broken GRUB bootloader leaves a system completely unbootable. Common causes include overwriting GRUB during a Windows installation in a dual-boot setup, a failed kernel update, manual edits to `grub.cfg` that introduced errors, or disk changes that invalidated the boot partition location.

Recovery is done by booting from Ubuntu installation media and reinstalling GRUB into the correct disk location.

## Before You Start: Understanding the Problem

Different GRUB failures have different symptoms:

- **"error: no such partition"** - GRUB can't find the filesystem it expects
- **Grub rescue> prompt** - GRUB stage 1 loaded but stage 2 files are missing or corrupted
- **No bootloader at all (system goes to BIOS/UEFI boot menu)** - GRUB's MBR or EFI entry was overwritten
- **GRUB menu shows but selected entry fails** - Configuration error in grub.cfg

All of these are recoverable by reinstalling GRUB from a live environment.

## What You Need

- Ubuntu installation USB (or Live CD/DVD)
- Knowledge of your disk layout (which disk has Ubuntu)

## Step 1: Boot from Ubuntu Live USB

1. Insert the Ubuntu USB drive
2. Boot the system and enter BIOS/UEFI boot menu (usually F12, F2, Esc, or Del - varies by manufacturer)
3. Select "Boot from USB"
4. Select "Try Ubuntu" (not "Install Ubuntu")

## Step 2: Identify Your Disk Partitions

From the live environment, open a terminal and identify your disk layout:

```bash
# List block devices
lsblk

# More detailed partition info
sudo fdisk -l

# If using LVM
sudo pvs
sudo vgs
sudo lvs
```

Example output:

```
NAME        MAJ:MIN RM   SIZE RO TYPE MOUNTPOINT
sda           8:0    0   500G  0 disk
├─sda1        8:1    0   512M  0 part    <- EFI partition (if UEFI)
├─sda2        8:2    0     1G  0 part    <- /boot
└─sda3        8:3    0 498.5G  0 part    <- / (root, possibly LVM)
```

Note which partition is the root filesystem and which (if any) is `/boot` and EFI.

## Step 3: Mount the Ubuntu Filesystem

### Standard Layout (non-LVM)

```bash
# Mount root partition
sudo mount /dev/sda3 /mnt

# Mount boot partition if separate
sudo mount /dev/sda2 /mnt/boot

# Mount EFI partition if it exists (check if /mnt/boot/efi directory exists)
sudo mount /dev/sda1 /mnt/boot/efi
```

### LVM Layout

```bash
# Activate LVM volumes
sudo vgchange -ay

# Check what volumes are available
sudo lvs

# Mount root logical volume
sudo mount /dev/ubuntu-vg/ubuntu-lv /mnt

# Mount boot if separate
sudo mount /dev/sda2 /mnt/boot
```

### Encrypted Root (LUKS)

```bash
# Open the encrypted partition
sudo cryptsetup open /dev/sda3 ubuntu-root

# Mount the decrypted volume
sudo mount /dev/mapper/ubuntu-root /mnt
```

## Step 4: Bind Mount System Filesystems

The chroot environment needs access to `/dev`, `/proc`, and `/sys` from the live system:

```bash
sudo mount --bind /dev /mnt/dev
sudo mount --bind /dev/pts /mnt/dev/pts
sudo mount --bind /proc /mnt/proc
sudo mount --bind /sys /mnt/sys

# On UEFI systems, also bind the EFI variables
sudo mount --bind /sys/firmware/efi/efivars /mnt/sys/firmware/efi/efivars
```

## Step 5: Enter the chroot Environment

```bash
sudo chroot /mnt
```

You're now operating as root inside your Ubuntu installation. Commands you run here affect your actual system, not the live USB.

Verify you're in the right place:

```bash
ls /etc/os-release
cat /etc/os-release | grep VERSION
```

## Step 6: Reinstall GRUB

### For BIOS/Legacy Systems

Install GRUB to the MBR of the disk (not a partition):

```bash
# Install to the disk, not a partition (use /dev/sda not /dev/sda1)
grub-install /dev/sda

# Verify installation
grub-install --version
```

### For UEFI Systems

UEFI uses a different install target:

```bash
# Check if EFI vars are accessible
ls /sys/firmware/efi/efivars/

# Install GRUB for UEFI
grub-install --target=x86_64-efi --efi-directory=/boot/efi --bootloader-id=ubuntu

# If the above fails, try without nvram changes
grub-install --target=x86_64-efi --efi-directory=/boot/efi --bootloader-id=ubuntu --no-nvram
```

### Regenerate grub.cfg

```bash
update-grub
```

This scans for all installed kernels and generates a fresh boot menu. The output should list the kernels it found:

```
Sourcing file '/etc/default/grub'
Generating grub configuration file ...
Found linux image: /boot/vmlinuz-5.15.0-91-generic
Found initrd image: /boot/initrd.img-5.15.0-91-generic
done
```

## Step 7: Exit and Reboot

```bash
# Exit chroot
exit

# Unmount everything
sudo umount /mnt/sys/firmware/efi/efivars 2>/dev/null
sudo umount /mnt/sys
sudo umount /mnt/proc
sudo umount /mnt/dev/pts
sudo umount /mnt/dev
sudo umount /mnt/boot/efi 2>/dev/null
sudo umount /mnt/boot 2>/dev/null
sudo umount /mnt

# Reboot
sudo reboot
```

Remove the USB drive when the system restarts.

## Troubleshooting Common Issues

### grub-install Reports "EFI variables are not supported"

```bash
# Remount EFI vars with proper flags
sudo mount -t efivarfs efivarfs /sys/firmware/efi/efivars

# If that fails, the UEFI firmware may not be accessible from live USB
# Try with --no-nvram and manually add EFI entry
grub-install --target=x86_64-efi --efi-directory=/boot/efi --no-nvram
# Then manually register with efibootmgr:
efibootmgr --create --disk /dev/sda --part 1 --label "Ubuntu" \
  --loader '\EFI\ubuntu\grubx64.efi'
```

### update-grub Cannot Find Kernels

```bash
# Check if kernels exist
ls /boot/vmlinuz-*

# If empty, kernels need to be reinstalled
apt update
apt install --reinstall linux-image-$(uname -r)
```

Wait - in chroot, `uname -r` returns the live system's kernel. Reinstall the kernel that matches what was installed:

```bash
# List what kernel packages are installed
dpkg --list | grep linux-image
# Reinstall the correct one
apt install --reinstall linux-image-5.15.0-91-generic
update-grub
```

### Dual Boot: Windows Bootloader Overwrote GRUB

After following the steps above, add Windows to the GRUB menu:

```bash
# From chroot, install os-prober
apt install os-prober -y

# Run os-prober to detect other OSes
os-prober

# Regenerate grub.cfg
update-grub
```

### GRUB Rescue Prompt

If you see `grub rescue>` at boot, GRUB can still boot manually:

```
grub rescue> ls
(hd0) (hd0,msdos1) (hd0,msdos2) (hd0,msdos3)

grub rescue> ls (hd0,msdos3)/boot
vmlinuz-5.15.0-91-generic initrd.img-5.15.0-91-generic grub/

grub rescue> set root=(hd0,msdos3)
grub rescue> set prefix=(hd0,msdos3)/boot/grub
grub rescue> insmod normal
grub rescue> normal
```

This boots into GRUB normally where you can select Ubuntu, then follow the full reinstall procedure afterward.

## Preventing Future GRUB Issues

```bash
# Always test GRUB config before rebooting
sudo grub-script-check /boot/grub/grub.cfg

# Keep a backup of grub.cfg before major changes
sudo cp /boot/grub/grub.cfg /boot/grub/grub.cfg.bak

# After kernel updates, verify grub.cfg was updated
sudo update-grub && grep "menuentry" /boot/grub/grub.cfg | head -5
```

GRUB recovery is one of those skills you won't use often, but when a system is unbootable it's exactly the knowledge you need. The combination of live USB boot, chroot, `grub-install`, and `update-grub` handles the vast majority of GRUB recovery scenarios.
