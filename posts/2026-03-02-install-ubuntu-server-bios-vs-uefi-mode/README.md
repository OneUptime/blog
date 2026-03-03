# How to Install Ubuntu Server in BIOS vs UEFI Mode

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, BIOS, UEFI, Installation, Bootloader

Description: Understand the differences between BIOS and UEFI boot modes, and learn how to correctly install Ubuntu Server in each, including GRUB configuration and partition requirements.

---

One of the most common sources of confusion when installing Ubuntu Server is the difference between BIOS (legacy) and UEFI boot modes. Each mode requires different partition layouts, bootloader configurations, and installer behavior. Getting this wrong means your system either will not boot at all, or boots with a fragile configuration that breaks after updates.

This post explains both modes, how to identify which one your system uses, and what changes during Ubuntu installation in each case.

## BIOS vs UEFI: What Is Actually Different

### BIOS (Legacy Mode)

BIOS (Basic Input/Output System) is the original firmware standard dating back to the 1980s. In BIOS mode:

- The firmware reads the first 512 bytes of the boot disk (the Master Boot Record, MBR)
- The MBR contains the bootloader stage 1 and the partition table
- Partition tables use the MBR format, supporting a maximum of 4 primary partitions and disks up to 2 TB
- GRUB stage 1 fits in the MBR (446 bytes), with stage 1.5 in the space between MBR and the first partition

### UEFI (Unified Extensible Firmware Interface)

UEFI is the modern replacement. In UEFI mode:

- The firmware reads a special FAT32 partition called the EFI System Partition (ESP)
- The ESP contains bootloader executables (`.efi` files) in a directory structure
- Partition tables use the GUID Partition Table (GPT) format, supporting 128 primary partitions and disks up to 8 ZB
- Secure Boot can be used to verify bootloader signatures
- UEFI maintains a boot manager with entries pointing to specific `.efi` executables

## Identifying Your Boot Mode

### Before Installation

Check your UEFI firmware settings. If you see options for "Secure Boot", "UEFI/Legacy Boot Mode", or boot entries with `(UEFI)` labels, you have UEFI firmware. Look for a CSM (Compatibility Support Module) or Legacy Boot option - if CSM is enabled, you can boot in either mode.

### On a Running Ubuntu System

```bash
# Check for EFI directory - exists only in UEFI mode
[ -d /sys/firmware/efi ] && echo "UEFI mode" || echo "BIOS/Legacy mode"

# Check GRUB version and target
sudo grub-install --version
# Look at what target is installed
sudo efibootmgr -v  # Works only in UEFI mode
```

### During Installation

The Ubuntu Server installer detects the mode automatically. In UEFI mode, you will see an EFI partition suggested in the storage configuration. In BIOS mode, GRUB installs to the MBR.

## Partition Layout: BIOS Mode

In BIOS mode with a GPT disk, GRUB needs a special partition to store its core image:

```text
# BIOS + GPT partition layout
Device      Size    Type
/dev/sda1   1 MB    BIOS boot partition (type: 21686148-6449-6E6F-744E-656564454649)
/dev/sda2   1 GB    ext4 - /boot
/dev/sda3   rest    LVM PV or ext4 - /
```

The BIOS boot partition is not mounted anywhere and has no filesystem - it is just a container for GRUB's core image. Without it on a GPT disk in BIOS mode, GRUB cannot install.

If you use MBR partitioning with BIOS (the traditional combination):

```text
# BIOS + MBR partition layout
Device      Size    Type
/dev/sda1   1 GB    ext4 - /boot (bootable flag)
/dev/sda2   rest    Linux LVM or ext4 - /
```

The GRUB stage 1 goes directly in the MBR. No separate BIOS boot partition is needed.

### Installing GRUB in BIOS Mode

```bash
# Install GRUB to the MBR of /dev/sda (BIOS/MBR)
sudo grub-install /dev/sda

# Or for BIOS + GPT (install to disk, not a partition)
sudo grub-install --target=i386-pc /dev/sda

# Update GRUB configuration
sudo update-grub
```

## Partition Layout: UEFI Mode

In UEFI mode, the EFI System Partition is required:

```text
# UEFI + GPT partition layout
Device      Size     Type           Filesystem
/dev/sda1   512 MB   EFI System     FAT32 - /boot/efi
/dev/sda2   1 GB     Linux FS       ext4  - /boot
/dev/sda3   rest     Linux LVM      LVM/ext4 - /
```

The EFI partition is formatted as FAT32 and mounted at `/boot/efi`. GRUB installs as a `.efi` executable in `/boot/efi/EFI/ubuntu/grubx64.efi`.

### Installing GRUB in UEFI Mode

```bash
# Install GRUB for UEFI (requires efivarfs mounted and EFI partition mounted at /boot/efi)
sudo grub-install --target=x86_64-efi --efi-directory=/boot/efi --bootloader-id=ubuntu

# Update GRUB configuration
sudo update-grub

# Verify EFI boot entry was created
sudo efibootmgr -v
```

## Ubuntu Server Installer Behavior

The Ubuntu Server installer (subiquity) automatically detects the firmware mode and adjusts its storage recommendations:

### UEFI Mode

The guided storage configuration creates an EFI partition (minimum 538 MB), a separate `/boot` partition, and a root volume. If the disk already has an ESP (for example, on a system that previously ran Windows), the installer will reuse it rather than creating a new one.

### BIOS Mode

The installer creates a BIOS boot partition (1 MB) if using GPT, then a `/boot` partition and root volume. If using MBR partitioning, it sets the bootable flag on `/boot` or the root partition.

## Converting Between Modes

Converting a running system from BIOS to UEFI (or vice versa) is complex and risky. The safer approach is to reinstall. However, if you must convert:

### BIOS to UEFI

```bash
# Install UEFI GRUB package
sudo apt install grub-efi-amd64

# Create and format EFI partition (assumes /dev/sda1 is free or can be created)
sudo mkfs.fat -F32 /dev/sda1
sudo mkdir -p /boot/efi
sudo mount /dev/sda1 /boot/efi

# Convert partition table from MBR to GPT (use gdisk - this is dangerous)
# Only do this if you understand the risks and have a backup
sudo gdisk /dev/sda  # Use 'r' then 'f' to convert MBR to GPT

# Add EFI partition to fstab
echo "UUID=$(blkid -s UUID -o value /dev/sda1)  /boot/efi  vfat  umask=0077  0  1" | sudo tee -a /etc/fstab

# Install GRUB for UEFI
sudo grub-install --target=x86_64-efi --efi-directory=/boot/efi --bootloader-id=ubuntu
sudo update-grub
```

## Common Pitfalls

### Installing UEFI GRUB on a BIOS System

If the machine boots in BIOS mode but you install `grub-efi`, the system will not boot because the BIOS cannot read EFI executables. Always match the GRUB target to the firmware mode.

### MBR Partition Table with UEFI

You can technically have a UEFI system boot from an MBR disk, but GPT is strongly preferred and required for disks over 2 TB. The EFI specification requires GPT for optimal compatibility.

### Missing EFI Variables in a Container or VM

When repairing GRUB from a chroot (e.g., after booting from a live USB), UEFI mode requires that EFI variables are accessible:

```bash
# Mount EFI variable filesystem before chrooting
sudo mount --bind /sys/firmware/efi/efivars /mnt/sys/firmware/efi/efivars
```

Without this, `grub-install` will fail with an error about EFI variables not being writable.

### VM Considerations

When creating a VM, match the firmware type to what you want:
- VirtualBox: Machine Settings - System - Motherboard - Enable EFI
- VMware: Virtual Machine Settings - Options - Advanced - UEFI

Changing this after creating the VM usually requires reinstalling.

Understanding BIOS vs UEFI is foundational knowledge for anyone managing Linux servers. The Ubuntu Server installer handles the details correctly when left to auto-detect, but when something breaks - a failed GRUB install, a migrated disk, or a repaired system - knowing which mode you are in and what partition layout it requires is essential.
