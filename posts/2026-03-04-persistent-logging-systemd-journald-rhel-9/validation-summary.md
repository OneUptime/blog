# Validation Summary: How to Configure Persistent Logging with systemd-journald on RHEL

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- systemd-journald
- journalctl
- journald.conf
- rsyslog
- systemd timers

## Sources Consulted
- Red Hat Enterprise Linux 9 documentation: Configuring the systemd journal by using RHEL system roles - https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/automating_system_administration_by_using_rhel_system_roles/configuring-the-systemd-journal-by-using-the-journald-rhel-system-role_automating-system-administration-by-using-rhel-system-roles
- Red Hat Enterprise Linux 9 documentation: The Rsyslog logging service - https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/security_hardening/assembly_configuring-a-remote-logging-solution_security-hardening
- systemd upstream documentation: journald.conf(5) - https://www.freedesktop.org/software/systemd/man/journald.conf.html
- systemd upstream documentation: journalctl(1) - https://www.freedesktop.org/software/systemd/man/journalctl.html
- systemd upstream documentation: systemd.timer(5) - https://www.freedesktop.org/software/systemd/man/systemd.timer.html
- Local system man pages for journald.conf(5), journalctl(1), and systemd.timer(5)

## Issues Found
- The post said RHEL typically stores journald logs persistently because `/var/log/journal/` typically exists on standard installations. Red Hat documentation states that RHEL is not configured by default to maintain persistent journal logs. Updated the introduction to explain RHEL's non-persistent default and the `Storage=auto` behavior accurately.
- The `Storage=persistent` explanation said journald always stores logs in `/var/log/journal/`. Updated it to mention the documented fallback to `/run/log/journal/` during early boot or when the disk is not writable.
- The size-limit section implied journald has no limits unless the administrator sets them. Updated it to explain that journald has defaults, but those defaults may need tuning for small `/var` partitions.
- The `SystemMaxUse` description called the setting a hard cap. Updated it to reflect that journald removes archived files and active files can temporarily keep usage above the configured value.
- The rsyslog section said `ForwardToSyslog=` defaults to `yes`. Current systemd documentation says upstream defaults only wall forwarding to enabled, and Red Hat documents rsyslog as reading messages from the journal. Updated the section so it does not rely on `ForwardToSyslog=` alone to determine whether `/var/log/` files are being written.
- The practical tip for `--vacuum-time` claimed it ensures at least N days of history. Updated it because size limits can still remove older archived journal files when space is constrained.

## Review Notes
The remaining commands and configuration examples are valid for the documented tooling: `journalctl --disk-usage`, `--list-boots`, `--vacuum-time`, `--vacuum-size`, `--vacuum-files`, `--verify`, `journalctl -b -1`, journald size settings, and the systemd timer directives are all current and documented. A future improvement would be to recommend a journald drop-in under `/etc/systemd/journald.conf.d/` instead of editing `/etc/systemd/journald.conf` directly, because upstream systemd documentation recommends drop-ins for local overrides.
