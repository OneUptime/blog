# Validation Summary: How to Monitor XFS File System Health and Fragmentation on RHEL

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- XFS filesystem
- xfsprogs utilities (`xfs_info`, `xfs_db`, `xfs_spaceman`, `xfs_quota`)
- Linux filesystem and I/O monitoring tools (`df`, `filefrag`, `iostat`, `iotop`, `dmesg`)
- Bash and cron-based monitoring

## Sources Consulted
- Red Hat Enterprise Linux 9 Managing file systems documentation: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/managing_file_systems/managing_file_systems
- Red Hat Enterprise Linux 9 Monitoring and managing system status and performance documentation: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/monitoring_and_managing_system_status_and_performance/monitoring_and_managing_system_status_and_performance
- Red Hat Enterprise Linux 9 Package manifest: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/package_manifest/index
- `xfs_info(8)` manual page: https://man7.org/linux/man-pages/man8/xfs_info.8.html
- `xfs_db(8)` manual page: https://man7.org/linux/man-pages/man8/xfs_db.8.html
- `xfs_spaceman(8)` manual page: https://man7.org/linux/man-pages/man8/xfs_spaceman.8.html
- `filefrag(8)` manual page: https://www.man7.org/linux/man-pages/man8/filefrag.8.html
- `xfs_quota(8)` manual page: https://man7.org/linux/man-pages/man8/xfs_quota.8.html
- Linux kernel XFS statistics source (`xfs_stats.c` and `xfs_stats.h`): https://github.com/torvalds/linux/tree/master/fs/xfs
- GNU coreutils `df` help output on the review system
- Local `filefrag` and `iostat` help output on the review system

## Issues Found
- The `xfs_db` section described the tool as monitoring filesystem health. `xfs_db` is primarily a low-level inspection/debugging tool; its `freesp` command summarizes free-space layout, not filesystem consistency or online health state. I changed the section heading and wording to clarify that it inspects free space and is not a substitute for `xfs_repair -n` or `xfs_spaceman health`.
- The XFS statistics section listed internal kernel field names such as `xs_write_calls` as if they were directly shown in `/proc/fs/xfs/stat`. The exported stats are grouped under labels such as `rw`, `log`, and `extent_alloc`. I updated the wording to describe the exported lines and their meanings.
- The post referred only to `/proc/fs/xfs/stat`. On current RHEL, this path is retained as a compatibility path to statistics exported under `/sys/fs/xfs/`. I updated the text to reflect that.

## Review Notes
The commands are otherwise technically valid for a RHEL 9 system with the relevant packages installed. The threshold values in the health indicator table are operational guidelines rather than XFS-defined limits, so they should be tuned for the workload and storage backend.
