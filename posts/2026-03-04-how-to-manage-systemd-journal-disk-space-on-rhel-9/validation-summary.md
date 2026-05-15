# Validation Summary: How to Manage systemd Journal Disk Space on RHEL 9

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- systemd journal
- systemd-journald
- journalctl
- systemd timers

## Sources Consulted
- Red Hat Enterprise Linux 9 documentation, "Configuring the systemd journal by using RHEL system roles": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/automating_system_administration_by_using_rhel_system_roles/configuring-the-systemd-journal-by-using-the-journald-rhel-system-role_automating-system-administration-by-using-rhel-system-roles
- systemd journald.conf(5) manual: https://www.freedesktop.org/software/systemd/man/journald.conf.html
- systemd journalctl(1) manual: https://www.freedesktop.org/software/systemd/man/journalctl.html
- Local installed systemd manual pages for journald.conf(5) and journalctl(1)

## Issues Found
- The post said RHEL 9 stores journals persistently in `/var/log/journal/` by default. Red Hat's RHEL 9 documentation says the default journal storage is volatile under `/run/log/journal`, so this was corrected.
- The vacuum command descriptions said they remove journal entries. The `journalctl` manual specifies that vacuuming removes archived journal files, not active journal files or individual entries, so the wording was corrected.
- The journal file listing command only checked `/var/log/journal/*/`, which can be absent on default volatile RHEL 9 systems. The command now checks both `/run/log/journal/*/` and `/var/log/journal/*/`.
- The conclusion said journal management prevents `/var` from filling. Because RHEL 9 defaults to volatile journal storage unless persistent logging is configured, this was generalized to log storage.

## Review Notes
The remaining commands and configuration keys are valid: `journalctl --disk-usage`, `--vacuum-size`, `--vacuum-time`, `--vacuum-files`, `--verify`, `Storage=`, `SystemMaxUse=`, `SystemKeepFree=`, `SystemMaxFileSize=`, `RuntimeMaxUse=`, `MaxRetentionSec=`, and `ForwardToSyslog=` are documented systemd options. The manual notes that drop-in configuration files are recommended for local overrides, but editing `/etc/systemd/journald.conf` remains valid.
