# How to Fix Ubuntu Stuck at Boot Screen

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Boot, Troubleshooting, System Recovery

Description: Step-by-step instructions for diagnosing and fixing an Ubuntu system that freezes or hangs at the boot screen, including GPU, service, and filesystem causes.

---

An Ubuntu system that hangs at the boot screen - whether it's a blank screen, a stuck progress bar, or a frozen splash screen - is one of the more frustrating problems to deal with. You can't log in, you can't read the error, and the system is just sitting there doing nothing.

This guide covers the most common reasons Ubuntu gets stuck at boot and how to work through each of them systematically.

## Remove the Splash Screen to See What's Happening

The boot splash screen hides the actual output. Before anything else, disable it so you can see what's going on:

1. Restart the machine
2. Hold Shift (for BIOS/MBR) or press Escape repeatedly (for UEFI) to get the GRUB menu
3. Highlight the Ubuntu entry and press `e` to edit
4. Find the line starting with `linux` and locate `quiet splash`
5. Replace `quiet splash` with `nomodeset` or just delete both words
6. Press `Ctrl+X` or `F10` to boot with those parameters

With splash removed, you'll see the actual systemd output scrolling by. The last line before the freeze is your clue.

## Common Cause 1: GPU Driver Problems

This is the most frequent culprit, especially after kernel updates or fresh installs on NVIDIA hardware. The system loads, hits the graphics initialization, and locks up.

The `nomodeset` parameter you set above disables kernel mode-setting, which forces software rendering. If the system boots with `nomodeset` but not without it, you have a GPU driver issue.

To make `nomodeset` permanent while you fix the underlying driver:

```bash
# Open the GRUB configuration
sudo nano /etc/default/grub

# Find this line:
GRUB_CMDLINE_LINUX_DEFAULT="quiet splash"

# Change it to:
GRUB_CMDLINE_LINUX_DEFAULT="nomodeset"

# Update GRUB
sudo update-grub
```

Then fix the actual driver:

```bash
# Check what graphics hardware you have
lspci | grep -i vga

# For NVIDIA: remove the nouveau driver and install proprietary
sudo apt purge xserver-xorg-video-nouveau
sudo ubuntu-drivers autoinstall

# Or install a specific version
sudo apt install nvidia-driver-535

# Reboot
sudo reboot
```

After rebooting with the proper NVIDIA driver, remove `nomodeset` from GRUB and update again.

## Common Cause 2: A Slow or Failing Service

Sometimes a service is taking too long to start and the system appears hung while waiting for it. Check with:

```bash
# Boot into recovery mode from GRUB menu
# Then choose "root" at the recovery menu

# Check which services are slow
systemd-analyze blame

# Check for failed units
systemctl --failed

# See what's currently loading
systemctl list-jobs
```

If a service is waiting for network that isn't available, this is a common cause:

```bash
# Check if network-online.target is causing delays
systemd-analyze critical-chain network-online.target

# Disable waiting for network if you don't need it
sudo systemctl disable NetworkManager-wait-online.service
```

For a service that's completely hung (not just slow), you can mask it to skip it on next boot:

```bash
sudo systemctl mask problem-service.service
sudo reboot
```

## Common Cause 3: Filesystem Errors

A filesystem with errors can cause boot to hang while it waits for user input on a check. This often manifests as a long wait followed by a drop to emergency mode, but sometimes it just hangs.

Boot into recovery mode, then:

```bash
# Check filesystems listed in fstab
cat /etc/fstab

# Run fsck on suspect partitions (not mounted)
sudo fsck -y /dev/sda2

# Check the root filesystem
# You'll need a live USB for this since you can't unmount /
```

From a live USB:

```bash
# Boot live USB, open terminal
# Find your root partition
lsblk

# Run fsck
sudo fsck -y /dev/sda1
```

## Common Cause 4: Failed initramfs or Kernel

A corrupted initramfs or a bad kernel update can prevent boot. GRUB usually keeps previous kernel versions available.

From the GRUB menu:
1. Select "Advanced options for Ubuntu"
2. Choose an older kernel version
3. If it boots, regenerate the initramfs for the new kernel

```bash
# Regenerate initramfs for all installed kernels
sudo update-initramfs -u -k all

# Or for a specific kernel version
sudo update-initramfs -u -k 6.8.0-45-generic

# Update GRUB to ensure menu is current
sudo update-grub
```

If the old kernel works but the new one doesn't and regenerating initramfs doesn't help:

```bash
# Remove the problematic kernel
sudo apt remove linux-image-6.8.0-50-generic

# Keep using the older working kernel
sudo apt hold linux-image-6.8.0-50-generic
```

## Common Cause 5: Plymouth Crash

Plymouth is the boot splash manager. It occasionally crashes and causes a visual hang even though the system is actually working underneath.

```bash
# Disable plymouth
sudo nano /etc/default/grub

# Remove "splash" from GRUB_CMDLINE_LINUX_DEFAULT
GRUB_CMDLINE_LINUX_DEFAULT="quiet"

sudo update-grub
```

Or replace it:

```bash
sudo apt install --reinstall plymouth plymouth-theme-ubuntu-text
sudo update-initramfs -u
```

## Common Cause 6: Disk Timeout

If the system is waiting for a disk that doesn't exist or is slow to spin up, it may appear frozen. Adding `rootdelay` helps:

```bash
# In GRUB edit mode, add to the linux line:
rootdelay=30
```

This gives the disk 30 extra seconds to appear before the kernel gives up.

## Using Recovery Mode for Diagnosis

GRUB's recovery mode is your best friend here:

1. From GRUB menu, select "Advanced options for Ubuntu"
2. Select the recovery mode option for your kernel
3. You'll get a menu with options: resume, clean, dpkg, grub, network, root, system-summary

The "root" option drops you to a root shell where you can diagnose and fix most issues. "system-summary" shows recent logs. "dpkg" attempts to fix broken packages.

## Verifying the Fix

After making changes, boot normally and confirm the system reaches login:

```bash
# Check boot time
systemd-analyze

# Check for any remaining errors
journalctl -b -p err

# Verify no failed units
systemctl --failed
```

If everything looks clean and the system boots to the login screen consistently across a few reboots, you're good.
