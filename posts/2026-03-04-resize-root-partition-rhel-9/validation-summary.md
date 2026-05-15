# Validation Summary: How to Resize a Root Partition on RHEL

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- LVM logical volumes, volume groups, and physical volumes
- XFS and ext4 filesystems
- growpart and cloud-utils-growpart
- GRUB bootloader recovery
- Linux swap volumes

## Sources Consulted
- Red Hat Enterprise Linux 9 documentation: Configuring and managing logical volumes - https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/configuring_and_managing_logical_volumes/
- Red Hat Enterprise Linux 9 documentation: Managing file systems - https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/managing_file_systems/managing_file_systems
- Red Hat Enterprise Linux 9 documentation: Restoring an XFS file system from backup - https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/managing_file_systems/restoring-an-xfs-file-system-from-backup_managing-file-systems
- Red Hat Enterprise Linux 9 documentation: Reinstalling GRUB - https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/managing_monitoring_and_updating_the_kernel/assembly_reinstalling-grub_assembly_managing-kernel-command-line-parameters-with-uki
- growpart(1) manual page, cloud-utils

## Issues Found
- The XFS backup and recreate example used generic `tar` commands to copy a full root filesystem. For an XFS filesystem restore, Red Hat documents `xfsdump` and `xfsrestore`; using those tools is the appropriate filesystem-aware backup/restore path. Updated the example to use `xfsdump -l 0` for backup and `xfsrestore` for restore.

## Review Notes
- The LVM extension commands using `lvextend -r`, `pvcreate`, `vgextend`, `growpart`, and `pvresize` are consistent with documented RHEL/LVM workflows.
- The warning that XFS cannot be shrunk in place is correct for RHEL 9. ext4 supports both growing and shrinking, while XFS supports growing only.
- The GRUB regeneration path shown with `grub2-mkconfig -o /boot/grub2/grub.cfg` matches Red Hat's RHEL 9 guidance for both BIOS and UEFI systems; the EFI stub path should not be regenerated directly.
