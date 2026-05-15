# Validation Summary: How to Recover a Deleted Partition on RHEL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux 9
- EPEL
- TestDisk
- PhotoRec
- fdisk
- sfdisk
- gdisk and sgdisk
- dd
- partprobe

## Sources Consulted
- Fedora EPEL documentation: https://tdawson.fedorapeople.org/epel-docs/public/epel/getting-started/
- Fedora Packages for testdisk in EPEL 9: https://packages.fedoraproject.org/pkgs/testdisk/testdisk/epel-9.html
- TestDisk partition recovery documentation: https://www.cgsecurity.org/testdisk_doc/partition_recovery.html
- PhotoRec recovery documentation: https://www.cgsecurity.org/testdisk_doc/photorec.html
- GPT fdisk documentation: https://www.rodsbooks.com/gdisk/gdisk.html
- Red Hat Enterprise Linux 9 storage documentation: https://docs.redhat.com/documentation/en-us/red_hat_enterprise_linux/9/html/managing_storage_devices/disk-partitions_managing-storage-devices
- Local command help for `dd`, `sfdisk`, `partprobe`, `sgdisk`, and `gdisk`

## Issues Found
- The EPEL installation command used `sudo dnf install -y epel-release`, which is not the recommended RHEL 9 enablement path. Updated it to enable CodeReady Builder and install the official EPEL 9 release RPM URL.
- The TestDisk restore steps skipped changing a found partition from `D` (deleted) to a recoverable status. Added the required step to mark the partition as primary, logical, or bootable before writing the partition table.
- The mount examples assumed `/mnt/recovered` already existed. Added `sudo mkdir -p /mnt/recovered` before mounting.
- The manual `fdisk` recovery example did not warn about preserving an existing filesystem signature. Added a note to answer No if `fdisk` asks whether to remove the signature.
- The GPT recovery example described a general primary GPT recovery but only used `gdisk` option `b`, which rebuilds the primary GPT header from the backup. Clarified that case and added guidance to use `c` when the primary GPT partition table itself is damaged.

## Review Notes
The recovery guidance is technically sound after the fixes. In a future revision, the post could mention working from a live environment before installing packages on an affected boot disk, and using a destination disk with enough free space before running `dd`.
