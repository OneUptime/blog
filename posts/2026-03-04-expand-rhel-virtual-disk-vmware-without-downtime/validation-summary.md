# Validation Summary: How to Expand a RHEL Virtual Disk in VMware Without Downtime

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux
- VMware vSphere / ESXi virtual disks
- Linux SCSI device rescans
- LVM physical volumes, volume groups, and logical volumes
- XFS and ext4 filesystem growth
- growpart / cloud-utils-growpart

## Sources Consulted
- Broadcom VMware Knowledge Base: Increasing the disk size on a Virtual Machine - https://knowledge.broadcom.com/external/article?articleNumber=344854
- Broadcom VMware Knowledge Base: Best practices for using VMware snapshots in the vSphere environment - https://knowledge.broadcom.com/external/article?legacyId=1025279
- Red Hat Enterprise Linux 9 documentation: Configuring and managing logical volumes - https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/configuring_and_managing_logical_volumes/configuring_and_managing_logical_volumes
- Red Hat Enterprise Linux 7 documentation: Increasing the Size of an XFS File System - https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/7/html/storage_administration_guide/xfsgrow
- Red Hat Enterprise Linux 6 documentation: Resizing a Physical Volume - https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/6/html/logical_volume_manager_administration/pv_resize
- Red Hat Customer Portal: How do I grow an LVM Physical Volume on a partition after resizing the disk? - https://access.redhat.com/solutions/57183
- growpart manual page - https://manpages.debian.org/testing/cloud-guest-utils/growpart.1.en.html
- Local command help/man pages for `growpart`, `resize2fs`, and `lsblk`

## Issues Found
- The post stated that the VM does not need to be powered off when expanding the virtual disk. VMware documentation makes this conditional: snapshots must be removed, and hot extend depends on the virtual controller and vSphere version. Updated the note, description, introduction, and closing sentence to clarify the hot-extend/hot-add requirement.
- The partition section said "GPT partition table with a single partition" but the command grows partition 3 (`growpart /dev/sda 3`). Updated the text to say the example applies when the LVM physical volume is on partition 3.

## Review Notes
The LVM and filesystem workflow is technically valid for the example layout: rescan the disk, grow the partition, run `pvresize`, extend the logical volume, and grow XFS with `xfs_growfs` or ext4 with `resize2fs`. Device names such as `/dev/sda3`, `/dev/sdb`, `rhel`, and `/dev/mapper/rhel-root` are environment-specific examples and should be checked with `lsblk`, `pvs`, `vgs`, and `lvs` before running the commands.
