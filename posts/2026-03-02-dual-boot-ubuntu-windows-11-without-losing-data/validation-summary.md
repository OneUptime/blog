# Validation Summary: How to Dual Boot Ubuntu and Windows 11 Without Losing Data

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ubuntu 24.04 LTS
- Windows 11
- UEFI and EFI System Partition
- Secure Boot
- BitLocker
- Rufus bootable USB creation
- GRUB
- NTFS mounting with ntfs-3g
- systemd timedatectl

## Sources Consulted
- Ubuntu Desktop installation tutorial: https://ubuntu.com/tutorials/install-ubuntu-desktop
- Ubuntu Desktop documentation for creating bootable USB media with Rufus: https://documentation.ubuntu.com/desktop/en/24.04/how-to/create-a-bootable-usb-stick/
- Ubuntu UEFI community documentation: https://help.ubuntu.com/community/UEFI
- Ubuntu ntfs-3g manpage: https://manpages.ubuntu.com/manpages/questing/man8/mount.lowntfs-3g.8.html
- Microsoft BitLocker operations guide: https://learn.microsoft.com/en-us/windows/security/operating-system-security/data-protection/bitlocker/operations-guide
- Microsoft Get-BitLockerVolume PowerShell documentation: https://learn.microsoft.com/en-us/powershell/module/bitlocker/get-bitlockervolume
- Microsoft Fast Startup / hibernation documentation: https://learn.microsoft.com/en-us/windows-hardware/drivers/kernel/distinguishing-fast-startup-from-wake-from-hibernation
- GNU GRUB manual: https://www.gnu.org/software/grub/manual/grub.html
- systemd timedatectl manual: https://www.freedesktop.org/software/systemd/man/timedatectl.html
- Local command help output for grub-install, lsblk, blkid, and timedatectl.

## Issues Found
- BitLocker guidance said to suspend BitLocker before repartitioning. Ubuntu's installer documentation says BitLocker must be turned off so the side-by-side installer can safely inspect the Windows disk layout. Updated the section to use `Disable-BitLocker -MountPoint C:` and explain that decryption must finish first.
- Rufus instructions required GPT and FAT32. Ubuntu's current Rufus documentation recommends leaving defaults in most cases and only changing to GPT / UEFI (non CSM) if the USB fails to boot. Updated the steps accordingly and added the ISO Image mode prompt.
- The Ubuntu installer option name "Something else" is outdated for the current Ubuntu Desktop installer. Updated it to "Manual partitioning".
- The post described a swap partition as part of the default automatic layout. Current Ubuntu desktop installs normally use a swap file unless the user creates a swap partition manually. Updated that explanation.
- The desktop installer section said to enable OpenSSH during installation, which is not part of the standard Ubuntu Desktop installer flow. Changed it to install OpenSSH after first boot if remote access is needed.
- The GRUB default entry example used a shortened Windows menu title that is unlikely to match the generated title exactly. Updated the guidance to prefer a numeric entry, exact generated menu title, or GRUB entry ID.
- The NTFS mount example mounted `/mnt/windows` without creating the mount point first. Added `sudo mkdir -p /mnt/windows`.
- The live-USB GRUB repair commands updated GRUB from the live environment rather than the installed Ubuntu system. Updated the example to bind mount system directories, chroot into the installed system, run `grub-install`, and then run `update-grub`.

## Review Notes
The guide is technically relevant and broadly accurate after the corrections. Remaining caveats are hardware-dependent: firmware boot-menu keys vary, Windows updates can change UEFI boot order, and Secure Boot behavior can vary if third-party kernel modules or unsigned drivers are installed.
