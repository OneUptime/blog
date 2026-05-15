# Validation Summary: How to Resize (Extend and Reduce) an ext4 File System on RHEL

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- ext4 filesystems
- e2fsprogs (`resize2fs`, `e2fsck`, `dumpe2fs`)
- LVM (`lvextend`, `lvreduce`, `vgchange`)
- Linux mount and unmount workflows

## Sources Consulted
- Red Hat Enterprise Linux 9 documentation, "Resizing an ext4 file system": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/managing_file_systems/getting-started-with-an-ext4-file-system_managing-file-systems#resizing-an-ext4-file-system_getting-started-with-an-ext4-file-system
- Red Hat Enterprise Linux 9 documentation, "Extending a linear logical volume" and "Shrinking logical volumes": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/configuring_and_managing_logical_volumes/basic-logical-volume-management_configuring-and-managing-logical-volumes
- `resize2fs(8)` man page from e2fsprogs 1.47.0
- `e2fsck(8)` man page from e2fsprogs

## Issues Found
- The post described `resize2fs /dev/vg_data/lv_data 20G` as reducing the filesystem to "20 GB". The `resize2fs` documentation defines `G` as a power-of-two unit, so this was changed to "20 GiB".
- The `lvreduce -r` example remounted with `sudo mount /data`, which only works when `/data` is configured in `/etc/fstab`. The command was changed to `sudo mount /dev/vg_data/lv_data /data` to work as shown in the guide without assuming an fstab entry.
- The root filesystem reduction section correctly required a rescue environment, but did not explicitly state that the filesystem must still be unmounted before `e2fsck` and `resize2fs`. The introductory sentence was updated to include that requirement.

## Review Notes
The remaining commands and operational ordering match the RHEL 9 documentation: ext4 can be grown online with `resize2fs`, shrinking requires an unmounted filesystem and a forced `e2fsck`, `lvextend -r` can grow the logical volume and filesystem together, and `lvreduce --resizefs`/`-r` can coordinate filesystem reduction with logical-volume reduction. The `resize2fs -P` minimum-size estimate is useful but documented as an estimate, so conservative free-space margins remain important.
