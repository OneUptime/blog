# Validation Summary: How to Fix 'XFS Metadata I/O Error' and Recover XFS on RHEL

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Red Hat Enterprise Linux
- XFS filesystem
- xfs_repair
- xfs_scrub
- xfsdump and xfsrestore
- smartctl
- Linux mount and unmount workflows

## Sources Consulted
- Red Hat Enterprise Linux 10 documentation, "Managing file systems": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/10/html-single/managing_file_systems/index
- xfs_repair(8) Linux manual page: https://man7.org/linux/man-pages/man8/xfs_repair.8.html
- xfs_scrub(8) Linux manual page: https://man7.org/linux/man-pages/man8/xfs_scrub.8.html

## Issues Found
- The `xfs_scrub` example used the block device (`/dev/sda1`). The official syntax takes a mounted filesystem mount point, and `-n` is required for check-only behavior, so it was changed to `sudo xfs_scrub -n /mnt/data`.
- The `xfsdump` example included a stray `-` between the backup destination and source path and did not specify a dump level. Red Hat's documented syntax is `xfsdump -l level -f backup-destination path-to-xfs-filesystem`, so it was changed to `sudo xfsdump -l 0 -f /tmp/xfs-backup /mnt/damaged`.
- The `xfsrestore` example also included a stray `-` before the restore path. Red Hat's documented syntax is `xfsrestore -f backup-location restoration-path`, so it was changed to `sudo xfsrestore -f /tmp/xfs-backup /mnt/restored`.

## Review Notes
The `xfs_repair -L` guidance is technically correct as a last resort, but Red Hat recommends replaying the log by mounting and cleanly unmounting the filesystem first when possible. For severe cases, capturing an `xfs_metadump` before repair can help with vendor support or root-cause analysis.
