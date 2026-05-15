# Validation Summary: How to Configure Persistent Journald Storage on RHEL

## Status
validated

## Post Type
Tutorial / system administration guide

## Technologies Covered
- Red Hat Enterprise Linux
- systemd-journald
- journald.conf
- journalctl
- systemd-tmpfiles

## Sources Consulted
- systemd journald.conf manual: https://www.freedesktop.org/software/systemd/man/journald.conf.html
- systemd journalctl manual: https://www.freedesktop.org/software/systemd/man/journalctl.html
- systemd time syntax manual: https://www.freedesktop.org/software/systemd/man/systemd.time.html
- systemd systemd-journald.service manual: https://www.freedesktop.org/software/systemd/man/systemd-journald.service.html
- Red Hat Enterprise Linux documentation for journald system role and persistent journal behavior: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/10/html/risk_reduction_and_recovery_operations/configuring-the-systemd-journal-by-using-rhel-system-roles
- Local `man journald.conf`, `man journalctl`, `man systemd.time`, `journalctl --help`, and `systemd-tmpfiles --help` output

## Issues Found
- The post said that if `/var/log/journal/` does not exist, storage is volatile. This is accurate for the default `Storage=auto` behavior, but not for every possible configuration. I clarified that the statement applies when `Storage=auto` is in use.
- The post said "Without limits, the journal can consume a lot of disk space." systemd-journald has documented default size limits (`SystemMaxUse`/`RuntimeMaxUse` default to 10% capped at 4G, and keep-free limits default to 15% capped at 4G). I changed this to say explicit limits help control disk usage.
- The storage option summary for `Storage=persistent` omitted the documented fallback to `/run/log/journal` when `/var` is unavailable or unwritable. I changed it to "stored preferably in `/var/log/journal/`."
- The storage option summary for `Storage=none` said all logs are discarded. The systemd documentation states that journal storage is disabled while forwarding to other targets can still work. I corrected the wording.

## Review Notes
The commands and configuration keys were otherwise valid: `Storage=persistent`, `SystemMaxUse`, `SystemMaxFileSize`, `SystemKeepFree`, `MaxRetentionSec=30day`, `journalctl --disk-usage`, `journalctl --list-boots`, `journalctl -b -1`, `journalctl --vacuum-size=500M`, `journalctl --vacuum-time=14d`, and `systemd-tmpfiles --create --prefix /var/log/journal` are supported by the referenced systemd documentation and local command help/man pages. A future improvement could mention `journalctl --flush` for moving volatile early-boot logs into persistent storage after enabling persistence, but the current restart-based procedure is technically valid.
