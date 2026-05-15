# Validation Summary: How to Defragment an XFS File System Using xfs_fsr on RHEL

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Red Hat Enterprise Linux
- XFS
- xfsprogs and `xfs_fsr`
- `filefrag`
- `xfs_db`
- systemd services and timers
- cron
- GNU coreutils `timeout`

## Sources Consulted
- Red Hat Enterprise Linux 9 documentation, "Managing file systems": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/managing_file_systems/managing_file_systems
- Red Hat Enterprise Linux 7 Storage Administration Guide, "Other XFS File System Utilities": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/7/html/storage_administration_guide/xfsothers
- `xfs_fsr(8)` manual page: https://man7.org/linux/man-pages/man8/xfs_fsr.8.html
- `xfs_db(8)` manual page: https://man7.org/linux/man-pages/man8/xfs_db.8.html
- `filefrag(8)` manual page: https://man7.org/linux/man-pages/man8/filefrag.8.html
- systemd `systemd.service(5)` documentation for `SuccessExitStatus=`: https://www.freedesktop.org/software/systemd/man/249/systemd.service.html
- systemd `systemd.exec(5)` documentation for `Nice=` and `IOSchedulingClass=`: https://www.freedesktop.org/software/systemd/man/247/systemd.exec.html
- GNU coreutils `timeout` documentation: https://www.gnu.org/software/coreutils/timeout

## Issues Found
- The post said `xfs_fsr -t 1800 /data` would run against `/data` for 30 minutes. The `xfs_fsr` manual states that `-t` has no meaning when filesystems or files are specified on the command line. Updated the example to `sudo xfs_fsr -t 1800` for global mode and added a note that specifying `/data` performs a one-pass run without a `-t` time limit.
- The systemd and cron examples used `xfs_fsr -t 3600 /data`, which would not time-limit the `/data` run. Replaced them with `/usr/bin/timeout 3600 /usr/sbin/xfs_fsr /data` and added `SuccessExitStatus=124` to the systemd service because GNU `timeout` exits with status 124 when it stops the command.
- The description of `xfs_fsr` internals said it updates the inode to point to new extents. The `xfs_fsr` manual describes copying to a temporary file and atomically interchanging the data extents, so the explanation was corrected.
- The resume section used `xfs_fsr /data`, but the manual says explicitly specified filesystems or files do not read or write `/var/tmp/.fsrlast_xfs`. Changed the example to no-argument `xfs_fsr` and added a note that resume state applies to global mode.
- The post said `xfs_fsr` processes files in inode order by default. The documented global algorithm selects files with the largest number of extents. Removed the inaccurate inode-order statement.
- The conclusion recommended routine periodic defragmentation broadly. Red Hat advises against periodic whole-filesystem defragmentation by default because XFS avoids fragmentation and system-wide defragmentation can fragment free space. Adjusted the recommendation to targeted or occasional defragmentation when measurements show a need.

## Review Notes
The remaining commands and configuration snippets are technically plausible for RHEL-style systems. The post could be improved later by noting that `xfs_fsr /data` only treats `/data` as a whole-filesystem target if it is an XFS mount point; otherwise targeted defragmentation should use individual file paths.
