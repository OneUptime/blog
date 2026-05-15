# Validation Summary: How to Configure Disk Quotas on ext4 File Systems on RHEL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux 9
- ext4 filesystems
- Linux disk quotas
- quota tools: `quotaon`, `quotaoff`, `edquota`, `setquota`, `repquota`, `quota`, `quotacheck`, `warnquota`
- `/etc/fstab`
- `tune2fs`
- cron

## Sources Consulted
- Red Hat Enterprise Linux 9 documentation, "Limiting storage space usage on ext4 with quotas": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/managing_file_systems/managing_file_systems#limiting-storage-space-usage-on-ext4-with-quotas_managing-file-systems
- Red Hat Enterprise Linux 9 documentation, "Getting started with an ext4 file system": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/managing_file_systems/managing_file_systems#getting-started-with-an-ext4-file-system_managing-file-systems
- `quotaon(8)` Linux manual page: https://www.man7.org/linux/man-pages/man8/quotaon.8.html
- `quotacheck(8)` Linux manual page: https://www.man7.org/linux/man-pages/man8/quotacheck.8.html
- `edquota(8)` Linux manual page: https://www.man7.org/linux/man-pages/man8/edquota.8.html
- `setquota(8)` Linux manual page: https://www.man7.org/linux/man-pages/man8/setquota.8.html
- `repquota(8)` Linux manual page: https://www.man7.org/linux/man-pages/man8/repquota.8.html
- `quota(1)` Linux manual page: https://www.man7.org/linux/man-pages/man1/quota.1.html
- `quotactl(2)` Linux manual page: https://man7.org/linux/man-pages/man2/quotactl.2.html
- `tune2fs(8)` manual page from e2fsprogs 1.46.5: https://man.he.net/man8/tune2fs

## Issues Found
- The original setup used only `/etc/fstab` options plus `quotacheck -cugm` to create visible `aquota.user` and `aquota.group` files. RHEL 9 documents the ext4 `quota` filesystem feature, enabled with `mkfs.ext4 -O quota` for new filesystems or `tune2fs -O quota` for existing filesystems. I updated the setup steps to use the ext4 quota feature and `tune2fs -Q usrquota,grpquota`.
- The original post said `quotacheck` creates `aquota.user` and `aquota.group` as part of the RHEL 9 ext4 workflow. With the ext4 quota feature enabled, quota information is stored in hidden system inodes and does not require visible quota files or `quotacheck`. I replaced that section with a verification step using `tune2fs -l`.
- The original `quotaon /data` and `quotaoff /data` examples relied on the default user-quota behavior and did not explicitly handle group quotas. I changed them to `quotaon -ug /data` and `quotaoff -ug /data` to match the post's user-and-group quota scope.
- The original maintenance guidance recommended running `quotacheck` periodically. For the RHEL 9 ext4 quota feature, quota usage is kept consistent by the filesystem, so I changed the guidance to use the ext4 quota feature rather than manually maintaining visible quota files.

## Review Notes
The remaining quota management examples for `edquota`, `setquota`, `repquota`, grace periods, and user quota checks align with the Linux quota tools manual pages. The warning script is a simple example that parses the default `repquota` text output; for production automation, `repquota -p` or machine-readable report output would be easier to parse reliably.
