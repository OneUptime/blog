# Validation Summary: How to Extend LVM Logical Volumes on RHEL

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- LVM logical volumes, volume groups, and physical volumes
- XFS filesystem growth
- ext4 filesystem growth
- Linux storage administration commands

## Sources Consulted
- Red Hat Enterprise Linux 9 documentation: Configuring and managing logical volumes: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/configuring_and_managing_logical_volumes/configuring_and_managing_logical_volumes
- Red Hat Enterprise Linux 9 documentation: Managing file systems, XFS growth with `xfs_growfs`: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/managing_file_systems/managing_file_systems
- Red Hat Enterprise Linux 9 documentation: Managing file systems, ext4 resizing with `resize2fs`: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/managing_file_systems/managing_file_systems
- `lvextend(8)` Linux manual page: https://man7.org/linux/man-pages/man8/lvextend.8.html
- Local `resize2fs` command usage output from e2fsprogs 1.47.0

## Issues Found
- The ext4 examples used `/dev/datavg/applv` while the rest of the tutorial consistently used `/dev/datavg/datalv`. Updated the `resize2fs` and `tune2fs` examples to use `/dev/datavg/datalv` so the commands refer to the same logical volume being extended.
- The post described LVM extension as always requiring no unmounting. Updated the wording to clarify that online growth depends on filesystem support. This matches RHEL guidance: XFS must be mounted to grow, and ext4 can be grown while mounted.
- The post said `lvextend -r` automatically detects the filesystem type and runs the appropriate resize command. Updated this to state that `-r` uses `fsadm` to resize supported filesystems, matching the `lvextend(8)` documentation.

## Review Notes
The core workflow and command options are correct for RHEL 9: `lvextend -L`, `lvextend -l +%FREE`, `pvcreate`, `vgextend`, `xfs_growfs`, `resize2fs`, and `lvextend --resizefs` are all current and supported. The examples assume the administrator has identified the correct new disk before running `pvcreate`, which is appropriate for a concise guide but should be handled carefully in production.
