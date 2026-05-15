# Validation Summary: How to Resolve 'Disk Full' Errors When /var/log Consumes All Space on RHEL 9

## Status
validated

## Post Type
Tutorial / Troubleshooting guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- Linux disk usage tools (`df`, `du`, `find`, `truncate`)
- systemd journal and `journalctl`
- `systemd-journald` configuration
- `logrotate`
- Cron system jobs

## Sources Consulted
- Red Hat Enterprise Linux 9 Configuring basic system settings, Chapter 6, Troubleshooting problems by using log files: https://docs.redhat.com/en-us/documentation/red_hat_enterprise_linux/9/pdf/configuring_basic_system_settings/Red_Hat_Enterprise_Linux-9-Configuring_basic_system_settings-en-US.pdf
- Red Hat Enterprise Linux 9 Configuring firewalls and packet filters, logrotate example for rsyslog-managed logs: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/configuring_firewalls_and_packet_filters/proc_configuring-logging-of-dropped-packets-to-a-file_assembly_example-protecting-a-lan-and-dmz-using-an-nftables-script
- `journalctl(1)` official systemd manual: https://www.freedesktop.org/software/systemd/man/latest/journalctl.html
- `journald.conf(5)` official systemd manual: https://www.freedesktop.org/software/systemd/man/latest/journald.conf.html
- `logrotate(8)` Linux manual page: https://man7.org/linux/man-pages/man8/logrotate.8.html
- `crontab(5)` Linux manual page: https://man7.org/linux/man-pages/man5/crontab.5.html
- Local system man pages for `journalctl(1)`, `journald.conf(5)`, and `logrotate(8)`

## Issues Found
- The cron alert example used `tr -d " %"`, which placed a literal `%` character in the `/etc/cron.d` command. In crontab command fields, an unescaped `%` is converted to a newline and the remaining text is sent to standard input. Changed the command to `tr -dc "0-9"` so it extracts the numeric percentage without using a literal percent character.

## Review Notes
- The `journalctl --vacuum-size` and `--vacuum-time` commands are valid, but systemd vacuums archived journal files, not currently active journal files.
- The `SystemMaxUse` and `MaxRetentionSec` settings are valid `systemd-journald` options.
- The `logrotate` directives shown are valid. For multi-file stanzas with a shared `postrotate` script, `sharedscripts` can be added in the future to run the reload hook once per rotation block rather than once for each rotated file.
