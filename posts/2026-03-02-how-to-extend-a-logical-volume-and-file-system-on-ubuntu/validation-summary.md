# Validation Summary: How to Extend a Logical Volume and File System on Ubuntu

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ubuntu
- Linux Logical Volume Manager (LVM)
- ext4
- XFS
- Linux storage administration commands

## Sources Consulted
- Linux manual page for `lvextend`: https://man7.org/linux/man-pages/man8/lvextend.8.html
- Linux manual page for `resize2fs`: https://man7.org/linux/man-pages/man8/resize2fs.8.html
- Linux manual page for `xfs_growfs`: https://man7.org/linux/man-pages/man8/xfs_growfs.8.html
- Linux manual page for `fsadm`: https://man7.org/linux/man-pages/man8/fsadm.8.html
- Linux manual page for `pvresize`: https://man7.org/linux/man-pages/man8/pvresize.8.html

## Issues Found
- The post said that for online `resize2fs`, the filesystem must be mounted. `resize2fs` supports expanding mounted ext3/ext4 filesystems when online resizing is supported, but it can also enlarge unmounted ext2/ext3/ext4 filesystems. Updated the wording to make the mounted requirement specific to online resizing, not to `resize2fs` growth in general.
- The post implied that when `VFree` is 0, adding a new disk is the required next step. That is one valid path, but expanding an existing Physical Volume and using `pvresize` can also add VG free space. Updated the wording to say storage must be added and framed adding a new PV as a common approach.

## Review Notes
The LVM `lvextend` examples, `-L`, `-l +100%FREE`, and `-r/--resizefs` usage are consistent with the LVM manual. XFS growth guidance is correct: `xfs_growfs` grows a mounted XFS filesystem, and XFS cannot be shrunk. The raw-disk `pvcreate /dev/sdd` examples are syntactically valid, but in production readers should verify the target disk is empty and intended for LVM before running them.
