# Validation Summary: How to Encrypt Individual Partitions Post-Installation on Ubuntu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ubuntu
- Linux block devices and filesystems
- cryptsetup
- LUKS/LUKS2
- `/etc/crypttab`
- `/etc/fstab`
- rsync, tar, dd, mount, fdisk, blkid, lsblk

## Sources Consulted
- Ubuntu crypttab(5) man page: https://manpages.ubuntu.com/manpages/noble/man5/crypttab.5.html
- Ubuntu cryptdisks_start(8) man page: https://manpages.ubuntu.com/manpages/xenial/man8/cryptdisks_start.8.html
- cryptsetup luksFormat(8) man page: https://man7.org/linux/man-pages/man8/cryptsetup-luksformat.8.html
- util-linux fstab(5) man page: https://man7.org/linux/man-pages/man5/fstab.5.html
- util-linux mount(8) man page: https://man7.org/linux/man-pages/man8/mount.8.html
- util-linux fdisk(8) man page: https://man7.org/linux/man-pages/man8/fdisk.8.html

## Issues Found
- The introduction said root partition encryption was covered, but the post only covers secondary and `/home` partitions. Changed the wording to say root encryption is not covered in detail.
- The partition inspection example used `fdisk -l` without elevated privileges. Changed it to `sudo fdisk -l`, which is the practical invocation for reading block device partition tables on Ubuntu systems.
- The persistent mount flow restored data under `/mnt/data-new` but configured `/data` in `/etc/fstab` without creating the final mount point or unmounting the temporary one. Added commands to unmount `/mnt/data-new` and create `/data`.
- The `/etc/fstab` example used `ext4` even though the guide also offers XFS. Added a note to use the filesystem type created earlier.
- The live USB `/home` example mounted paths under `/mnt` without creating those mount directories first. Added `mkdir -p` commands for `/mnt/home-backup` and `/mnt/home-new`.
- The temporary `/home` example was labeled as using another partition but copied to `/tmp`, which may be on the root filesystem or tmpfs. Changed the example path to `/mnt/home-temp` and described it as a location on another mounted partition.
- The summary said key files avoid storing plaintext keys. A key file is plaintext key material while the system is unlocked, though it can be protected at rest by encrypted root. Changed the wording to say keys are not stored on an unencrypted filesystem.

## Review Notes
The core cryptsetup, LUKS2, crypttab, fstab, mount, backup, and restore commands are technically valid. Future improvements could mention SSD/NVMe limitations for overwrite-based sanitization and the need to rebuild initramfs when encrypting boot-critical mounts or using key files required during early boot, but those are caveats rather than errors in the covered secondary-partition workflow.
