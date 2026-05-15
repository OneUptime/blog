# Validation Summary: How to Use noatime and nodiratime Mount Options for Performance on RHEL

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- Linux mount options
- XFS and ext4 filesystems
- `/etc/fstab`
- `mount`, `findmnt`, `stat`, `smartctl`
- `systemd-tmpfiles`

## Sources Consulted
- Red Hat Enterprise Linux 9 documentation: Factors affecting I/O and file system performance: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/monitoring_and_managing_system_status_and_performance/factors-affecting-i-o-and-file-system-performance_monitoring-and-managing-system-status-and-performance
- Red Hat Enterprise Linux 9 documentation: Managing file systems and `/etc/fstab`: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/managing_file_systems/
- Linux `mount(8)` manual page: https://man7.org/linux/man-pages/man8/mount.8.html
- Linux `fstab(5)` manual page: https://man7.org/linux/man-pages/man5/fstab.5.html
- RHEL 9 `tmpfiles.d(5)` manual page: https://redhat-plumbers.github.io/systemd-rhel9/tmpfiles.d.html
- systemd `tmpfiles.d(5)` manual page: https://www.freedesktop.org/software/systemd/man/tmpfiles.d.html

## Issues Found
- The introduction stated that every read updates atime on Linux. Updated it to distinguish traditional full atime behavior from RHEL's default `relatime` behavior.
- The atime option list described full atime updates as `atime`. Updated this to identify `strictatime` as the option for traditional full atime semantics and added an `atime` definition as the timestamp itself.
- The `relatime` description omitted change time (`ctime`). Updated the text and diagram to say atime is updated when the previous atime is older than the modify or change time, or when more than 24 hours have passed.
- The `nodiratime` description implied file atime is always updated. Updated it to say file atime follows the other atime options.
- The mail server example contained a corrupted mailbox format string. Replaced it with `mbox`.
- The root filesystem section said a reboot is required. Updated it to say the change takes effect after a reboot or a root remount, and added the `mount -o remount /` command.
- The performance section overstated that every file read avoided a metadata write. Updated it to refer to reads that would otherwise update atime, and made the before/after cache-drop steps consistent.
- The `systemd-tmpfiles` section referred to an `A` qualifier too narrowly. Updated it to describe access-time-dependent rules generally and note that tmpfiles also considers modification time and file change time by default.

## Review Notes
The post is technically sound after the corrections. Future improvements could mention `findmnt -o TARGET,VFS-OPTIONS,FS-OPTIONS` as a clearer verification command than parsing `mount` output, but the existing commands remain valid.
