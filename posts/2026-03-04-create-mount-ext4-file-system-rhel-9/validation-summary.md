# Validation Summary: How to Create and Mount an ext4 File System on RHEL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux
- ext4
- Linux storage partitioning
- `/etc/fstab`
- LVM
- `mkfs.ext4`, `mount`, `blkid`, `tune2fs`, `fdisk`, and `parted`

## Sources Consulted
- Red Hat Enterprise Linux 9 documentation: Getting started with an ext4 file system: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/managing_file_systems/getting-started-with-an-ext4-file-system_managing-file-systems
- Red Hat Enterprise Linux 9 documentation: Overview of available file systems: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/managing_file_systems/overview-of-available-file-systems_managing-file-systems
- Local `mkfs.ext4`/`mke2fs` man page
- Local `ext4` man page
- Local `mount` man page
- Local `fstab` man page
- Local GNU Parted `parted --help` output

## Issues Found
- The introduction stated that ext4 supports "online resizing (both growing and shrinking)." RHEL documentation says ext4 can be grown while mounted, but shrinking requires the filesystem to be unmounted and checked first. Updated the wording to "online growing, offline shrinking."

## Review Notes
- The remaining command examples and configuration snippets are technically valid for the covered workflow.
- RHEL 9 documentation lists ext4 support limits, including a 16 TB maximum individual file size and 50 TB maximum filesystem size; those limits are not mentioned in the post but could be useful future context.
