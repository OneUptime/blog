# Validation Summary: How to Repair a Broken Ubuntu Installation from a Live USB

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ubuntu (24.04 referenced; procedure generally applies to 20.04/22.04/24.04)
- GNU coreutils (`dd`)
- `lsblk`, `fdisk`, `blkid`
- LVM2 (`vgchange`, `lvs`)
- `mount --bind`, sysfs, procfs, devpts, efivarfs
- `chroot`
- GRUB 2 (`grub-install`, `update-grub`)
- APT and dpkg
- `fsck` (ext-family)
- `update-initramfs`
- AppArmor / `systemctl`

## Sources Consulted
- GNU GRUB Manual — Installing GRUB using grub-install: https://www.gnu.org/software/grub/manual/grub/html_node/Installing-GRUB-using-grub_002dinstall.html
- Ubuntu Community Help Wiki — UEFI: https://help.ubuntu.com/community/UEFI
- Ubuntu Launchpad Bug #1880855 (efivarfs bind mount for chroot grub-install): https://bugs.launchpad.net/bugs/1880855
- ArchWiki — chroot: https://wiki.archlinux.org/title/Chroot
- ArchWiki — GRUB: https://wiki.archlinux.org/title/GRUB
- Ubuntu Core docs — Use the dd command: https://documentation.ubuntu.com/core/tutorials/try-pre-built-images/use-the-dd-command/
- Ubuntu Wiki — FSTAB: https://wiki.ubuntu.com/FSTAB
- Lennart Poettering — systemd for Administrators, Part VI (Changing Roots): http://0pointer.de/blog/projects/changing-roots.html

## Issues Found
- **Same device mounted at two distinct mount points.** In the "Mounting the Installation" section, `/dev/sda1` was shown being mounted at both `/mnt/ubuntu/boot` (as a separate /boot partition) AND at `/mnt/ubuntu/boot/efi` (as the EFI System Partition). On a real Ubuntu layout these are necessarily different partitions, and the example would mislead readers. Updated the separate-/boot example to use `/dev/sda3` and added a clarifying note that a typical UEFI Ubuntu install has only ESP at `/dev/sda1` and root at `/dev/sda2` with no separate `/boot` partition.

## Review Notes
- The `mount --bind /sys/firmware/efi/efivars …` step is correct and necessary. A plain `--bind /sys` does not propagate the `efivarfs` submount, so the explicit bind is required for `grub-install` to access EFI variables (also see Launchpad #1880855). The alternative `mount -t efivarfs efivarfs …` inside the chroot is equivalent.
- `oflag=sync` on `dd` is valid and recommended for USB writes; `conv=fsync` is an acceptable, faster alternative.
- `systemctl disable apparmor` inside a chroot is legitimate — `enable`/`disable` only manipulate `/etc/systemd/system` symlinks and don't require systemd as PID 1. The post is correct on this.
- `pass=1` for the `/boot/efi` vfat entry in the sample fstab matches the value emitted by the Ubuntu installer (subiquity/ubiquity), so it is consistent with default Ubuntu installs even though some external guides prefer `0`.
- The fstab UUID placeholders use `xxxx-xxxx` for both ext4 and vfat. In reality ext4 UUIDs are 8-4-4-4-12 hex and vfat are 8 hex with a dash, but since they are clearly placeholders this is acceptable — left as-is.
- The initial `apt update` immediately after entering chroot depends on DNS being available; this works in practice because `/run` is bind-mounted and `/etc/resolv.conf` on modern Ubuntu points into `/run/systemd/resolve/`. The post addresses the explicit `cp /etc/resolv.conf …` workaround later, which is the safer guidance.
- "Try Ubuntu" wording in newer installers (24.04 desktop) is shown as "Try or Install Ubuntu" — minor cosmetic difference, not a technical error.
