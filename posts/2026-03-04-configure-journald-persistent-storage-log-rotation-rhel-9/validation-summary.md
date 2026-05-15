# Validation Summary: How to Configure journald Persistent Storage and Log Rotation on RHEL

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- systemd-journald
- journald.conf
- journalctl
- systemd-tmpfiles
- Bash
- cron

## Sources Consulted
- Red Hat Enterprise Linux 9 documentation: Configuring persistent logging by using the journald RHEL system role, https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/automating_system_administration_by_using_rhel_system_roles/configuring-the-systemd-journal-by-using-the-journald-rhel-system-role_automating-system-administration-by-using-rhel-system-roles
- systemd upstream journald.conf manual, https://www.freedesktop.org/software/systemd/man/journald.conf.html
- Local `journald.conf(5)` man page for `Storage=`, `SystemMaxUse=`, `SystemKeepFree=`, `SystemMaxFileSize=`, `SystemMaxFiles=`, `RuntimeMaxUse=`, `RuntimeKeepFree=`, and `MaxRetentionSec=`
- Local `journalctl(1)` help/man page for `--disk-usage`, `--vacuum-time`, `--vacuum-size`, `--vacuum-files`, `--rotate`, and `--header`
- Local `systemd.time(7)` man page for supported time span units

## Issues Found
- The post incorrectly stated that persistent journald storage is the RHEL default. Red Hat Enterprise Linux 9 documentation says the default journal uses `/run/log/journal`, which is not persistent. Updated the introduction and Step 1 to say persistent storage is not the default on RHEL.
- The `Storage=none` description said it drops all logs. Upstream `journald.conf(5)` notes that forwarding to targets such as console, kernel log buffer, or syslog socket can still work. Updated the description to include that caveat.
- The `SystemKeepFree` comment described it as the threshold that triggers cleanup when the journal exceeds a size. `journald.conf(5)` defines it as free disk space that journald should leave for other uses. Updated the comment.
- The `SystemMaxFileSize` default omitted the 128M cap documented by `journald.conf(5)`. Updated the default table entry.
- The runtime limit defaults were described as percentages of RAM. `journald.conf(5)` defines these as percentages of the runtime filesystem used for `/run/log/journal`. Updated the table entries.

## Review Notes
The `journalctl` commands and journald configuration keys used in the post are valid. Vacuuming removes archived journal files, so active journal files can still keep disk usage or file counts above a requested vacuum limit immediately after a cleanup.
