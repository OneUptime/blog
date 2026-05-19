# Validation Summary: How to Configure SOC 2 Audit Logging on Ubuntu

## Status
validated

## Post Type
Technical tutorial / compliance hardening guide

## Technologies Covered
- Ubuntu
- Linux audit subsystem (`auditd`, `auditctl`, `augenrules`, `ausearch`, `aureport`)
- rsyslog log forwarding and TLS forwarding
- OpenSSH server logging
- sudoers command and I/O logging
- AIDE file integrity monitoring
- logrotate
- SOC 2 Trust Services Criteria

## Sources Consulted
- AICPA & CIMA SOC 2 Trust Services Criteria resources: https://www.aicpa-cima.com/topic/audit-assurance/audit-and-assurance-greater-than-soc-2
- AICPA Trust Services Criteria PDF: https://us.aicpa.org/content/dam/aicpa/interestareas/frc/assuranceadvisoryservices/downloadabledocuments/trust-services-criteria-redlined.pdf
- Linux audit `audit.rules(7)` manual: https://man.archlinux.org/man/core/audit/audit.rules.7.en
- Linux audit `auditctl(8)` manual: https://man.archlinux.org/man/auditctl.8.en
- Linux audit `auditd.conf(5)` manual: https://man7.org/linux/man-pages/man5/auditd.conf.5.html
- Linux audit `auditd(8)` manual: https://man7.org/linux/man-pages/man8/auditd.8.html
- Linux audit `ausearch(8)` manual: https://man7.org/linux/man-pages/man8/ausearch.8.html
- Linux audit `aureport(8)` manual: https://man7.org/linux/man-pages/man8/aureport.8.html
- rsyslog forwarding documentation: https://docs.rsyslog.com/doc/getting_started/forwarding_logs.html
- rsyslog `omfwd` documentation: https://docs.rsyslog.com/doc/configuration/modules/omfwd.html
- OpenSSH `sshd_config(5)` manual: https://man.openbsd.org/sshd_config
- sudoers manual: https://www.sudo.ws/docs/man/1.9.14/sudoers.man/
- Ubuntu `aideinit(8)` manual: https://manpages.ubuntu.com/manpages/noble/man8/aideinit.8.html
- Ubuntu `aide.conf(5)` manual: https://manpages.ubuntu.com/manpages/questing/man5/aide.conf.5.html
- `logrotate(8)` manual: https://man7.org/linux/man-pages/man8/logrotate.8.html

## Issues Found
- The post stated that SOC 2 requires at least one year of log retention. The AICPA Trust Services Criteria do not prescribe a fixed log retention period, so this was changed to say retention should match the organization's SOC 2 control description and contractual/regulatory commitments.
- The rsyslog example loaded `module(load="omfwd")`, which fails validation on Ubuntu Noble because `omfwd` is built in rather than shipped as a loadable module. Removed the module load line and verified the forwarding configuration with `rsyslogd -N1`.
- Several audit file watches used legacy `-w ... -p ... -k ...` syntax. Converted these to current `-a always,exit` rules with `path=` or `dir=`, `perm=`, and `key=` fields.
- The audit rules watched `/var/run/faillock/`, which is not present on a default Ubuntu system and can cause rule loading to fail. Removed that rule.
- The `ausearch` examples used unsupported relative date strings (`"start of week"` and `"this month"`). Replaced them with documented values: `this-week` and `this-month`.
- The `aureport` example used unsupported relative date strings (`"last month"` and `"this month"`). Replaced it with `--start week-ago --end today`.
- The AIDE instructions initialized the database before adding the custom log-monitoring rules. Moved initialization after the local rule file is created.
- The AIDE cron example used `/usr/sbin/aide`, but Ubuntu's `aide` binary is installed under `/usr/bin/aide`. Corrected the path.
- The logrotate example attempted to rotate `/var/log/audit/audit.log` separately even though the guide already configured `auditd`'s own rotation. Removed that conflicting logrotate block and clarified that `auditd.conf` controls audit log rotation.

## Review Notes
- The sudoers snippet was validated with `visudo -cf`.
- The rsyslog forwarding and TLS action syntax was validated locally with `rsyslogd -N1`.
- The audit rule syntax was checked against the Linux audit manuals, but `auditd` was not installed in the review environment, so `augenrules --load` was not executed locally.
