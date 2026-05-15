# Validation Summary: How to Set Up User and Group Quotas on ext4 File Systems on RHEL

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- ext4 file systems
- Linux disk quotas
- quota-tools commands: quotaon, quotaoff, edquota, setquota, repquota
- e2fsprogs commands: tune2fs, mkfs.ext4, e2fsck
- /etc/fstab mount configuration
- cron

## Sources Consulted
- Red Hat Enterprise Linux 9 Managing file systems documentation: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/managing_file_systems/managing_file_systems
- quotaon(8) Linux manual page: https://www.man7.org/linux/man-pages/man8/quotaon.8.html
- edquota(8) Linux manual page: https://www.man7.org/linux/man-pages/man8/edquota.8.html
- setquota(8) Linux manual page: https://man7.org/linux/man-pages/man8/setquota.8.html
- repquota(8) Linux manual page: https://man7.org/linux/man-pages/man8/repquota.8.html
- mke2fs(8) Linux manual page: https://man7.org/linux/man-pages/man8/mke2fs.8.html
- Local e2fsprogs command help for tune2fs, mkfs.ext4, and findmnt.

## Issues Found
- The repquota examples used `repquota -ua /home`, `repquota -ga /home`, and `repquota -uas /home`. The `-a` option reports all quota-enabled filesystems from the mounted filesystem table and is not the correct form when targeting a specific filesystem. Changed these commands to `repquota -u /home`, `repquota -g /home`, and `repquota -us /home`.
- The weekly cron report used `/usr/sbin/repquota -uas /home`, with the same `-a` plus specific filesystem issue. Changed it to `/usr/sbin/repquota -us /home`.

## Review Notes
- The RHEL 9 documentation confirms that `mkfs.ext4 -O quota` and `tune2fs -O quota` enable the ext4 quota feature, with user and group quotas initialized by default.
- The RHEL 9 documentation confirms that quota enforcement can be enabled with `quotaon` or at mount time with `usrquota` and `grpquota` mount options.
- The setquota and edquota examples use 1024-byte block units correctly, and the grace-period examples use seconds as documented.
