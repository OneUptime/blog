# Validation Summary: How to Configure tmpfs Size Limits and Mount Options on RHEL

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Red Hat Enterprise Linux
- Linux tmpfs
- mount and fstab
- systemd mount units
- systemd-logind runtime directories
- Linux filesystem mount options

## Sources Consulted
- Linux `tmpfs(5)` man page: https://man7.org/linux/man-pages/man5/tmpfs.5.html
- Linux `mount(8)` man page: https://man7.org/linux/man-pages/man8/mount.8.html
- GNU Coreutils `df` documentation: https://www.gnu.org/software/coreutils/manual/html_node/df-invocation.html
- systemd `logind.conf(5)` documentation: https://www.freedesktop.org/software/systemd/man/latest/logind.conf.html
- systemd `systemd.mount(5)` documentation: https://www.freedesktop.org/software/systemd/man/latest/systemd.mount.html
- systemd `file-hierarchy(7)` documentation: https://www.freedesktop.org/software/systemd/man/latest/file-hierarchy.html
- Red Hat Enterprise Linux 9 Managing file systems documentation: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/managing_file_systems/
- Red Hat Enterprise Linux documentation for enabling `/tmp` as tmpfs with `tmp.mount`: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/7/html/migration_planning_guide/ch04s03s02

## Issues Found
- The post said tmpfs calculates the default inode count from the `size=` limit. Linux `tmpfs(5)` documents the default inode limit as based on physical RAM pages, so the text was corrected.
- The `/run` section implied that a `run-user-1000.mount` override changes the top-level `/run` tmpfs. systemd documentation distinguishes `/run` from per-user `/run/user/$UID` tmpfs mounts, and `RuntimeDirectorySize=` applies to `$XDG_RUNTIME_DIR`; the section was corrected to describe per-user runtime directory sizing via a `logind.conf` drop-in.
- The `nodev` description said it prevents device file creation. `mount(8)` documents `nodev` as preventing character or block special devices from being interpreted, so the wording was corrected.
- The ownership example used `uid=apache,gid=apache` directly. `tmpfs(5)` documents `uid=` and `gid=` as IDs, so the example now resolves account names to numeric UID/GID values with `id`.

## Review Notes
The remaining commands and snippets are consistent with the consulted documentation. Security options such as `noexec`, `nosuid`, and `nodev` are useful hardening controls but can break workloads that need direct execution from `/tmp` or `/dev/shm`, so those choices should be tested before applying them broadly.
