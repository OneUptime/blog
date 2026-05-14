# Validation Summary: How to Troubleshoot 'Read-Only Filesystem' Errors on RHEL

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Red Hat Enterprise Linux
- Linux filesystems
- ext4
- XFS
- LVM
- SMART monitoring
- systemd-fsck
- /etc/fstab

## Sources Consulted
- Red Hat Enterprise Linux 8 documentation: Checking and repairing a file system, https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/8/html/managing_file_systems/checking-and-repairing-a-file-system__managing-file-systems
- Red Hat Enterprise Linux 7 documentation: Repairing an XFS File System, https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/7/html/storage_administration_guide/xfsrepair
- Red Hat Enterprise Linux 10 documentation: Persistently mounting file systems, https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/10/html/managing_file_systems/persistently-mounting-file-systems
- systemd-fsck manual page, https://www.freedesktop.org/software/systemd/man/latest/systemd-fsck@.service.html
- util-linux mount, findmnt, fsck, and fstab manual/help output
- xfs_scrub manual page, https://man7.org/linux/man-pages/man8/xfs_scrub.8.html
- badblocks manual page from e2fsprogs

## Issues Found
- The read-only mount discovery command used `mount | grep "ro,"`, which can be noisy and less precise. Changed it to `findmnt -O ro`, which is the util-linux command intended for filtering mounts by option.
- The write test used `/tmp/testfile`, but `/tmp` can be a separate writable filesystem or tmpfs and might not test the affected mount. Changed the example to `/data/testfile`.
- The ext4 repair example used generic `fsck -y`. Changed it to `fsck.ext4 -f -y` so the example explicitly invokes the ext4 checker and forces a full check.
- The root filesystem section used `touch /forcefsck`, which is not the documented systemd mechanism on current RHEL-style systems. Changed it to use `fsck.mode=force fsck.repair=yes` kernel arguments via `grubby`, followed by removal of those arguments after reboot.
- The XFS scrub example used a block device path. `xfs_scrub` expects an XFS mount point, so the example now uses `/data`.

## Review Notes
- The post is technically relevant and mostly accurate. The remaining examples are intentionally generic and assume device names such as `/dev/sda2`; production RHEL systems should usually prefer persistent identifiers such as UUIDs or LVM paths in `/etc/fstab`.
