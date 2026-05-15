# Validation Summary: How to Manage systemd Journal Disk Space on RHEL

## Status
validated

## Post Type
Guide

## Technologies Covered
- Red Hat Enterprise Linux
- systemd-journald
- journalctl
- journald.conf
- rsyslog

## Sources Consulted
- Red Hat Enterprise Linux 7 System Administrator's Guide, "Viewing and Managing Log Files": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/7/html/system_administrators_guide/ch-viewing_and_managing_log_files
- Red Hat Customer Portal, "How to enable persistent logging for the systemd journal": https://access.redhat.com/solutions/696893
- systemd journald.conf manual: https://www.freedesktop.org/software/systemd/man/journald.conf.html
- systemd journalctl manual: https://www.freedesktop.org/software/systemd/man/journalctl.html
- Local man pages for journalctl(1), journald.conf(5), and systemd-journald.service(8)

## Issues Found
- The post incorrectly stated that RHEL stores journal logs in `/var/log/journal/` by default. Red Hat documentation states that the default journal is volatile under `/run/log/journal/` unless persistent storage is enabled. Updated the introduction to distinguish default volatile storage from persistent storage.
- The "Disable Persistent Journal Storage" section relied only on removing `/var/log/journal`. That works with the default `Storage=auto` behavior, but not if journald is configured with `Storage=persistent`. Added `Storage=volatile` to make the instruction explicit and reliable.
- The storage verification command used `journalctl --header | grep "Storage"`, but `--header` displays journal file header information, not the configured storage mode. Replaced it with a direct check of `/run/log/journal` and `/var/log/journal`.

## Review Notes
- The `journalctl --disk-usage`, `--vacuum-time`, `--vacuum-size`, and `--vacuum-files` commands are valid. The journalctl manual notes that vacuuming affects archived journal files, while active journal files may remain until rotation.
- The `SystemMaxUse`, `SystemMaxFileSize`, `MaxRetentionSec`, `SystemKeepFree`, and `ForwardToSyslog` settings are valid journald.conf directives.
