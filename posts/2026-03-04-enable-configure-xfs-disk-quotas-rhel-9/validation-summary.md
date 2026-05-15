# Validation Summary: How to Enable and Configure XFS Disk Quotas on RHEL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux 9
- XFS filesystem
- XFS disk quotas
- xfsprogs and xfs_quota
- /etc/fstab mount configuration
- cron-based quota reporting

## Sources Consulted
- Red Hat Enterprise Linux 9 documentation, "Managing file systems", Chapter 22: Limiting storage space usage on XFS with quotas: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/managing_file_systems/managing_file_systems
- Red Hat Enterprise Linux 9 documentation, XFS and ext4 comparison: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/managing_file_systems/managing_file_systems
- xfs(5) Linux manual page for XFS quota mount options: https://man7.org/linux/man-pages/man5/xfs.5.html
- xfs_quota(8) Linux manual page for limit, report, quota, and timer command syntax: https://man7.org/linux/man-pages/man8/xfs_quota.8.html

## Issues Found
- The post said XFS quotas cannot be turned on without "remounting" the filesystem. Current RHEL documentation states XFS quotas are not a remountable option and must be active on the initial mount. Updated the wording to say the filesystem must be unmounted and mounted again.
- The post stated that group quotas and project quotas cannot be enabled at the same time on XFS. Current RHEL 9 documentation says this mutual exclusion applies only to older, non-default XFS disk formats. Updated the note to reflect current default RHEL 9 behavior.

## Review Notes
- The xfs_quota examples for user limits, group limits, reports, individual quota checks, and grace-period timers match documented command syntax.
- The /etc/fstab quota options shown are valid XFS quota mount options. Red Hat's examples also use the synonymous quota, gquota, and prjquota forms.
- The cron example assumes a working mail command or mail transfer setup is present. That is an operational prerequisite rather than an XFS quota syntax issue.
