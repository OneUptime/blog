# Validation Summary: How to Partition a New Disk Using fdisk on RHEL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux 9
- Linux block devices and partition tables
- fdisk
- sfdisk
- MBR/DOS and GPT partition tables
- XFS and ext4 filesystems
- /etc/fstab and UUID-based mounts

## Sources Consulted
- Red Hat Enterprise Linux 9 Managing storage devices, Chapter 3 Disk partitions: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/managing_storage_devices/disk-partitions_managing-storage-devices
- util-linux fdisk(8) manual page, checked locally with `man fdisk` and `fdisk --help`
- util-linux sfdisk(8) manual page, checked locally with `man sfdisk`, `sfdisk --help`, and `sfdisk --list-types`
- util-linux fstab(5) manual page, checked locally with `man fstab`
- util-linux lsblk and mount command help, checked locally with `lsblk --help` and `mount --help`
- GNU Parted manual and partprobe help: https://www.gnu.org/software/parted/manual/parted.html
- e2fsprogs mke2fs/mkfs.ext4 manual page, checked locally with `man mkfs.ext4`

## Issues Found
- The post said new partitions default to type `83` without scoping that statement to MBR. This is not accurate for GPT, which uses GUID-based partition types. I changed the wording to say that MBR Linux partitions commonly use type `83` and labeled the examples as common MBR type codes.
- The MBR limitations section said the maximum disk size is `2 TB`. Red Hat documents this as a 2 TiB maximum partition size for 512-byte sector drives, with different limits on 4 KiB sector drives. I changed the bullet to `Maximum partition size: 2 TiB on 512-byte sector disks` and softened the follow-up recommendation to refer to large disks generally.

## Review Notes
The interactive `fdisk` examples, `partprobe`, `mkfs.ext4`, mounting, UUID-based `/etc/fstab` entries, and `sfdisk` unnamed-fields examples are technically valid. `mkfs.xfs` was not installed in this local environment, but the command is standard on RHEL systems with XFS tools installed.
