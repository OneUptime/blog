# How to Dual Boot Ubuntu and Windows 11 Without Losing Data

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Windows, Dual Boot, Installation, Partitioning

Description: A safe, step-by-step guide to setting up a dual boot configuration with Ubuntu and Windows 11, preserving your existing data throughout the process.

---

Dual booting Ubuntu alongside Windows 11 is one of the most practical ways to get a Linux environment without giving up your Windows setup. The process has a few potential pitfalls - BitLocker encryption, Secure Boot, and Fast Startup can all cause problems - but if you follow the steps carefully, you can have both systems running on the same machine with all your data intact.

## Before You Start: Critical Preparations

### Back Up Your Data

This is non-negotiable. Disk operations always carry some risk. Use Windows Backup, a USB drive, or a cloud service to create a current backup of anything you cannot afford to lose.

### Disable Fast Startup in Windows

Fast Startup causes Windows to write a hibernation image to disk rather than fully shutting down. If Ubuntu mounts the Windows partition while that image is present, it can corrupt the filesystem.

1. Open Control Panel - Power Options
2. Click "Choose what the power buttons do"
3. Click "Change settings that are currently unavailable"
4. Uncheck "Turn on fast startup"
5. Save changes

### Check BitLocker Status

If BitLocker is encrypting your Windows drive, suspend it before repartitioning:

```powershell
# Run in PowerShell as Administrator to check status
Get-BitLockerVolume -MountPoint C:

# Suspend BitLocker temporarily
Suspend-BitLocker -MountPoint C: -RebootCount 0
```

Re-enable it after the dual boot is fully working.

### Check Secure Boot

Secure Boot is compatible with Ubuntu 22.04 and later - you do not need to disable it. Confirm you are using UEFI mode (not legacy BIOS) by checking System Information in Windows:

```
Win + R -> msinfo32 -> look for "BIOS Mode: UEFI"
```

## Step 1: Shrink the Windows Partition

Open Disk Management in Windows (right-click the Start button, select Disk Management). Find your C: drive, right-click it, and choose "Shrink Volume".

Decide how much space to allocate to Ubuntu. A reasonable minimum is 40 GB, but 80-100 GB is more comfortable if you plan to install applications and store files. Enter the amount to shrink in MB (e.g., 81920 for 80 GB) and click Shrink.

You will see unallocated space appear next to the C: partition. Do not format it - leave it as unallocated. Ubuntu's installer will use it.

If Windows refuses to shrink beyond a certain point due to unmovable files (like the pagefile or hibernation file), you may need to use a third-party partition tool like GParted from a live USB, or disable the pagefile temporarily.

## Step 2: Create a Bootable Ubuntu USB

Download the Ubuntu 24.04 LTS ISO from ubuntu.com. Write it to a USB drive using Rufus on Windows:

- Select the ISO
- Partition scheme: GPT (required for UEFI systems)
- File system: FAT32
- Click Start

## Step 3: Boot from the USB

Restart and enter your boot menu (F12, F11, or Del depending on your hardware). Select the USB drive. On systems with Secure Boot, Ubuntu's signed bootloader will load without issue.

## Step 4: Installing Ubuntu Alongside Windows

Choose "Try or Install Ubuntu". On the installation type screen, the installer should detect Windows 11 and offer "Install Ubuntu alongside Windows Boot Manager". Select this option.

### What This Does

The installer will show a slider letting you divide the unallocated space. Drag it to set how much goes to Ubuntu. This creates:

- An ext4 partition for Ubuntu's root filesystem
- A swap partition (or swap file, depending on the installer version)

The existing Windows EFI System Partition (ESP) is shared - Ubuntu adds its GRUB bootloader to the same ESP, which is the correct behavior on UEFI systems.

### Manual Partitioning (Optional)

If you prefer full control, choose "Something else" on the installation type screen. You will see your disk layout. Click on the unallocated space and create:

```
# Suggested layout for the unallocated space:
/boot/efi  - Use existing Windows EFI partition (do NOT format it, just assign mount point)
/          - ext4, 40+ GB
swap       - 2-4 GB (optional if you have enough RAM)
/home      - ext4, remaining space (optional but recommended)
```

Do not format the EFI partition - just select it and assign `/boot/efi` as the mount point.

## Step 5: Complete Installation

Fill in your username, hostname, and password. Enable the OpenSSH server if you want remote access. Let the installer run to completion.

When it finishes, it will ask you to remove the USB drive and press Enter to restart.

## Step 6: Using GRUB to Choose Your OS

On the next boot, GRUB will appear and list your boot options:

- Ubuntu
- Windows Boot Manager
- Ubuntu (recovery mode)

Select Ubuntu to boot into Linux, or Windows Boot Manager for Windows. GRUB's default timeout is 10 seconds, after which it boots the default entry (Ubuntu).

### Changing the Default Boot Entry

To make Windows the default:

```bash
# Open GRUB configuration
sudo nano /etc/default/grub
```

Find `GRUB_DEFAULT=0` and change it to `GRUB_DEFAULT="Windows Boot Manager"` or to the numeric position of the Windows entry in the GRUB menu.

Then update GRUB:

```bash
sudo update-grub
```

### Adjusting the Timeout

```bash
# Set GRUB timeout to 5 seconds
# In /etc/default/grub:
GRUB_TIMEOUT=5

# Apply changes
sudo update-grub
```

## Accessing Windows Files from Ubuntu

Ubuntu can read and write NTFS partitions (Windows drive) using the ntfs-3g driver, which is included by default:

```bash
# List available partitions to find the Windows drive
lsblk -f

# Mount the Windows partition (replace /dev/sda3 with your partition)
sudo mount /dev/sda3 /mnt/windows

# Or add to /etc/fstab for automatic mounting at boot
# UUID=<windows-uuid>  /mnt/windows  ntfs-3g  defaults,uid=1000,gid=1000  0  0
```

Find the UUID with:

```bash
sudo blkid /dev/sda3
```

## Troubleshooting Common Issues

### GRUB Does Not Appear After Reboot

Windows sometimes overwrites the boot order after updates. Boot from your Ubuntu USB in "Try Ubuntu" mode and run:

```bash
# Reinstall GRUB to the EFI partition
sudo mount /dev/sda2 /mnt        # your Ubuntu root partition
sudo mount /dev/sda1 /mnt/boot/efi  # your EFI partition
sudo grub-install --target=x86_64-efi --efi-directory=/mnt/boot/efi --boot-directory=/mnt/boot
```

### Windows Will Not Boot After Installing Ubuntu

Make sure the Windows EFI partition was not reformatted during installation. If it was accidentally formatted, you will need to use the Windows recovery environment to rebuild the BCD.

### Time Sync Issues

Windows and Linux handle the hardware clock differently by default. On a dual boot setup, you may notice the clock is off after switching OSes. Fix it by making Ubuntu use local time instead of UTC:

```bash
# Make Linux use local time like Windows does
sudo timedatectl set-local-rtc 1 --adjust-system-clock
```

Or alternatively, configure Windows to use UTC by adding a registry key - which is the cleaner solution if you are comfortable with the registry.

With both systems installed and GRUB configured, you have a working dual boot setup. Each OS is isolated on its own partition, and switching between them is as simple as selecting at the GRUB menu during boot.
