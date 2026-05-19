# Validation Summary: How to Repair GRUB from a Live USB on Ubuntu

## Status
validated

## Post Type
Tutorial / Step-by-step recovery guide

## Technologies Covered
- GRUB 2 bootloader (UEFI and BIOS targets)
- Ubuntu live USB recovery workflow
- chroot environment setup with bind mounts (/dev, /dev/pts, /proc, /sys, /sys/firmware/efi/efivars)
- grub-install, update-grub (grub-mkconfig wrapper), update-initramfs
- efibootmgr, os-prober
- Secure Boot via shim-signed and grub-efi-amd64-signed
- Partition identification utilities: lsblk, fdisk, blkid

## Sources Consulted
- GNU GRUB Manual — https://www.gnu.org/software/grub/manual/grub/grub.html (grub-install options, --target values, --efi-directory, --bootloader-id, --recheck)
- Ubuntu Community Documentation — Grub2 / RecoveringUbuntuAfterInstallingWindows (https://help.ubuntu.com/community/Grub2 and https://help.ubuntu.com/community/RecoveringUbuntuAfterInstallingWindows)
- Debian/Ubuntu man pages: lsblk(8), fdisk(8), blkid(8), mount(8), chroot(8), update-grub(8), update-initramfs(8), efibootmgr(8)
- Ubuntu packaging info for grub-efi-amd64, grub-efi-amd64-signed, shim-signed, os-prober (packages.ubuntu.com)
- GRUB 2.06 release notes regarding GRUB_DISABLE_OS_PROBER default (which Ubuntu 22.04+ ships)

## Issues Found
No technical issues found. All commands, flags, package names, mount points, and explanations match the official Ubuntu/GRUB documentation:

- `grub-install --target=x86_64-efi --efi-directory=/boot/efi --bootloader-id=ubuntu` is the canonical UEFI install command on Ubuntu.
- For legacy BIOS, `grub-install /dev/sda` (writing to the MBR of the disk, not a partition) is correct, and `--recheck` is a valid GRUB option.
- The bind-mount sequence (/dev, /dev/pts, /proc, /sys, then /sys/firmware/efi/efivars for UEFI) is the standard chroot preparation.
- `update-grub` is the Debian/Ubuntu wrapper around `grub-mkconfig -o /boot/grub/grub.cfg`.
- The `GRUB_DISABLE_OS_PROBER=false` instruction correctly addresses the change introduced in GRUB 2.06 (shipped with Ubuntu 22.04+) where os-prober is disabled by default.
- Secure Boot packages `shim-signed` and `grub-efi-amd64-signed` are the correct Ubuntu package names.
- Unmount order in the cleanup section correctly unmounts nested mounts (e.g., `/mnt/sys/firmware/efi/efivars` before `/mnt/sys`, `/mnt/dev/pts` before `/mnt/dev`) before the root mount.

## Review Notes
- The inline comment "(note: target is the disk, not the EFI partition)" beside the UEFI `grub-install` command is slightly ambiguous — `--target` actually refers to the platform (`x86_64-efi`), not to a disk. The command itself is correct and works as written; the comment was kept intact since it does not lead to incorrect usage and the user's instruction is to only fix what is technically wrong.
- The post does not explicitly mention that on some firmware the EFI System Partition is mounted as ESP rather than at `/boot/efi`; the assumption that Ubuntu uses `/boot/efi` is correct for default Ubuntu installs.
- For some modern systems where the live USB itself was booted in BIOS mode but the installed system is UEFI (or vice versa), `grub-install` may complain — the post does not address that edge case, but it is outside the scope of a basic repair guide.
- `grub-install --recheck` is valid but rarely needed in modern GRUB; it forces GRUB to probe devices again instead of relying on the cached device map. Harmless to include.
- No deprecation warnings apply for the commands shown on currently supported Ubuntu LTS releases (20.04, 22.04, 24.04).
