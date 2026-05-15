# Validation Summary: How to Monitor Disk Quota Usage and Generate Reports on RHEL

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- Linux disk quotas
- `quota`, `repquota`, `xfs_quota`, and `warnquota`
- Bash scripting
- Cron scheduling
- `warnquota.conf` and `quotatab`

## Sources Consulted
- Red Hat Enterprise Linux 9 Managing file systems documentation: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/managing_file_systems/managing_file_systems
- `xfs_quota(8)` Linux manual page: https://man7.org/linux/man-pages/man8/xfs_quota.8.html
- `warnquota(8)` Linux manual page: https://man7.org/linux/man-pages/man8/warnquota.8.html
- `warnquota.conf(5)` Linux manual page: https://man7.org/linux/man-pages/man5/warnquota.conf.5.html
- `quotatab(5)` Linux manual page: https://man7.org/linux/man-pages/man5/quotatab.5.html

## Issues Found
- The admin report script detected quota filesystems with `mount | grep -E 'usrquota|uquota'`, which missed valid user quota mount options such as XFS `quota`. Updated it to use `findmnt` and match `quota`, `usrquota`, and `uquota` mount options.
- The admin report's over-soft-limit section implied XFS and non-XFS handling, but the command used `repquota`, which applies to the non-XFS path in the script. Renamed that subsection in the script output to `Non-XFS Users Over Soft Limit`.
- The `warnquota` section described `/etc/quotatab` as a user-to-email mapping. Official documentation defines it as a device/filesystem description file for notifications, so the text was corrected.
- The quota logger claimed to log each quota-enabled filesystem but only logged `/home`. Updated the comment to match the script behavior.
- The quota logger could write the `repquota` separator line to CSV because it only checked for an empty username. Added a check for an empty hard-limit field before writing a row.
- The quick dashboard sorted human-readable values with numeric sort, which can order values like `900M` above `1G`. Updated it to use GNU `sort -h`.

## Review Notes
The quota utilities were not installed in the local review environment, so command behavior was verified against Red Hat documentation and upstream Linux manual pages rather than live execution.
