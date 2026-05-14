# Validation Summary: How to Configure Soft and Hard Quota Limits with Grace Periods on RHEL

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- Linux disk quotas
- ext4 quotas
- XFS quotas
- `setquota`, `edquota`, `repquota`, and `xfs_quota`

## Sources Consulted
- Red Hat Enterprise Linux 9 Managing file systems: XFS quota management: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/managing_file_systems/assembly_limiting-storage-space-usage-on-xfs-with-quotas_managing-file-systems
- Red Hat Enterprise Linux 9 Managing file systems: ext4 quota management: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/managing_file_systems/limiting-storage-space-usage-on-ext4-with-quotas_managing-file-systems
- Linux `setquota(8)` manual page from man7.org: https://www.man7.org/linux/man-pages/man8/setquota.8.html
- Linux `xfs_quota(8)` manual page from man7.org: https://www.man7.org/linux/man-pages/man8/xfs_quota.8.html

## Issues Found
- The ext4 grace-period section stated that grace periods are strictly per filesystem and not per user. I changed this to describe filesystem grace periods as defaults, because current quota tools also support altering an individual user's current grace time.
- The XFS grace-period check used `awk '$2 ~ /\*/'`, but XFS quota reports do not use `*` markers for the grace state. I changed the command to filter rows whose Warn/Grace column is not the normal `[------]` state.
- The reset section said the only way to reset a grace period was to make the user drop below the soft limit. I added supported `setquota -T` and `xfs_quota timer ... user` examples for extending an individual user's current grace time, while keeping the original drop-below-soft-limit workaround as another option.

## Review Notes
The remaining command examples and explanations match the documented syntax and behavior for RHEL 9 quota management and the current upstream quota-tools/xfsprogs man pages. The examples assume quotas have already been enabled on the target filesystem.
