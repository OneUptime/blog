# Validation Summary: How to Automate Disk Partitioning with Scripted parted Commands on RHEL

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Red Hat Enterprise Linux 9 storage management
- GNU parted
- util-linux sfdisk, lsblk, findmnt, and blockdev
- XFS tools
- /etc/fstab mount configuration
- Ansible community.general and ansible.posix storage modules
- Bash scripting

## Sources Consulted
- Red Hat Enterprise Linux 9 documentation: Partition operations with parted: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/managing_file_systems/partition-operations-with-parted_managing-file-systems
- GNU Parted User Manual, mkpart: https://www.gnu.org/software/parted/manual/html_node/mkpart.html
- GNU Parted local CLI help, `parted --help`
- util-linux sfdisk(8) manual: https://man7.org/linux/man-pages/man8/sfdisk.8.html
- Local sfdisk manual, `man sfdisk`
- Ansible community.general.parted module documentation: https://docs.ansible.com/ansible/latest/collections/community/general/parted_module.html
- Ansible community.general.filesystem module documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/general/filesystem_module.html
- Ansible ansible.posix.mount module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/posix/mount_module.html

## Issues Found
- The sfdisk section was titled "Using sfdisk for MBR Scripting", but the example uses `label: gpt`. Changed the heading to "Using sfdisk for GPT Scripting" so it matches the command shown.
- The Ansible `community.general.parted` example created a GPT partition without a partition `name`, which the module documentation requires for GPT labels. Added `name: data` and `fs_type: xfs` to match the surrounding example.
- The error-handling example used `set -u` and then assigned `DISK=$1` before checking whether an argument was provided. Added an argument-count check before reading `$1`.
- The boot-disk detection example stripped trailing digits from the root source path, which can misidentify devices such as NVMe disks. Replaced it with `findmnt` plus `lsblk -no PKNAME` so it resolves the parent block device more accurately.

## Review Notes
The examples are intentionally destructive because they create new partition tables and filesystems. In production, these scripts should still be tested against the exact device naming, boot layout, and storage stack used by the target RHEL hosts before running at scale.
