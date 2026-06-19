# Validation Summary: How to Fix 'Read-Only File System' Errors

## Status
validated

## Post Type
Tutorial / troubleshooting guide

## Technologies Covered
- Linux filesystems and mount options
- ext4, XFS, and Btrfs
- fsck, e2fsck/fsck.ext4, fsck.xfs, and xfs_repair
- systemd fsck boot parameters
- smartmontools, smartctl, and smartd
- /etc/fstab configuration
- journalctl, dmesg, lsof, lsblk, blkid, df, find, and tune2fs

## Sources Consulted
- Linux mount(8) manual: https://man7.org/linux/man-pages/man8/mount.8.html
- Linux e2fsck(8) manual: https://man7.org/linux/man-pages/man8/e2fsck.8.html
- Linux fsck.xfs(8) manual: https://man7.org/linux/man-pages/man8/fsck.xfs.8.html
- systemd-fsck documentation: https://www.freedesktop.org/software/systemd/man/latest/systemd-fsck@.service.html
- systemctl documentation: https://www.freedesktop.org/software/systemd/man/latest/systemctl.html
- Linux fstab(5) manual: https://man7.org/linux/man-pages/man5/fstab.5.html
- Linux tune2fs(8) manual: https://man7.org/linux/man-pages/man8/tune2fs.8.html
- Local command help/man pages for journalctl, mount, fsck, systemctl, tune2fs, fstab, and related utilities

## Issues Found
- The post said `sudo systemctl --force --force reboot` schedules a filesystem check. This is incorrect: systemctl documents double `--force` for immediate forced reboot behavior, which can risk data loss. I replaced it with the documented systemd fsck kernel parameters `fsck.mode=force fsck.repair=yes` and clarified that they should be added at the bootloader prompt for the next boot.
- The post said "XFS does not use fsck." This was imprecise because `fsck.xfs` exists, but it does not repair XFS filesystems and exits successfully after noting that XFS recovery is normally handled at mount time. I changed the wording to say `fsck.xfs` does not repair XFS filesystems and that `xfs_repair` should be used for repairs.
- The `/forcefsck` advice was too broad for modern systemd-based systems. I qualified it as applicable to systems that support that legacy trigger and pointed systemd users to the documented kernel parameters instead.

## Review Notes
The remaining commands and configuration snippets are technically valid for common Linux distributions, with normal device-name caveats. SMART commands may require smartmontools to be installed and may need device-type options for some USB, RAID, NVMe, or virtualized storage devices.
