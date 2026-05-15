# Validation Summary: How to Log and Monitor Sudo Usage on RHEL

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- sudo and sudoers
- sudo I/O logging and sudoreplay
- Linux Audit / auditd
- rsyslog
- Bash, cron, logrotate, journalctl, logger, mail

## Sources Consulted
- Red Hat Enterprise Linux 9 Security hardening, Chapter 12: Auditing the system: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/security_hardening/auditing-the-system_security-hardening
- Red Hat Enterprise Linux 9 Configuring basic system settings, Managing sudo access and log files: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/htmlsingle/configuring_basic_system_settings/index
- Sudo sudoers manual, I/O logging, logfile, log_input, log_output, iolog_dir, log_year, and log_host: https://www.sudo.ws/docs/man/sudoers.man/
- Sudo sudoreplay manual, list/search/replay syntax: https://www.sudo.ws/docs/man/1.9.3/sudoreplay.man/
- rsyslog omfwd module documentation: https://www.rsyslog.com/doc/configuration/modules/omfwd.html
- Local man pages and tool checks: sudoers(5), sudoreplay(8), journalctl(1), logger(1), rsyslog.conf(5), sudo 1.9.15p5, rsyslog 8.2312.0

## Issues Found
- The I/O logging example set `iolog_dir=/var/log/sudo-io/%{user}` while the later replay examples used bare session IDs such as `000001`. With a per-user top-level I/O log directory, those replay examples would not match the configured path reliably. Changed the example to `Defaults iolog_dir=/var/log/sudo-io`, which matches sudo's documented default and the shown `sudoreplay` commands.
- The audit syscall rule used `-F path=/usr/bin/sudo` with `execve`. Red Hat's RHEL 9 audit documentation shows executable syscall tracking with `-F exe=/path/to/executable`; changed the rule to `-F exe=/usr/bin/sudo`.
- The failed-sudo alert script claimed to check the last five minutes but actually scanned all of `/var/log/secure`; the unused `SINCE` variable did not filter anything. Changed it to use `journalctl -t sudo --since "5 minutes ago" --no-pager` before filtering failure messages.
- The alert script logged to `auth.alert`. `logger` supports this, but `authpriv` is the more appropriate sensitive authentication facility on RHEL-style systems; changed it to `authpriv.alert`.

## Review Notes
- The remaining sudoers, sudoreplay, rsyslog, and Bash examples are technically valid for the described use case.
- `auditctl`, `ausearch`, and `augenrules` were not installed in the local review environment, so their syntax was verified against Red Hat's RHEL 9 audit documentation rather than executed locally.
- The audit rule shown targets 64-bit syscall execution (`arch=b64`), which is appropriate for typical RHEL 9 x86_64 deployments. Environments with unusual architecture requirements should adapt audit rules to their platform.
