# Validation Summary: How to Query and Filter systemd Journal Logs with journalctl on RHEL 9

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- systemd-journald
- journalctl
- rsyslog
- firewalld
- SELinux audit troubleshooting

## Sources Consulted
- Red Hat Enterprise Linux 9 documentation: Troubleshooting problems by using log files: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/configuring_basic_system_settings/assembly_troubleshooting-problems-using-log-files_configuring-basic-system-settings
- Red Hat Enterprise Linux 9 documentation: Configuring a remote logging solution: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/security_hardening/assembly_configuring-a-remote-logging-solution_security-hardening
- systemd journalctl manual: https://www.freedesktop.org/software/systemd/man/latest/journalctl.html
- systemd-journald service manual: https://www.freedesktop.org/software/systemd/man/latest/systemd-journald.service.html
- journald.conf manual: https://www.freedesktop.org/software/systemd/man/latest/journald.conf.html
- rsyslog.conf and rsyslogd local manual pages

## Issues Found
- The post stated that querying and filtering journal logs with `journalctl` requires editing rsyslog or journald configuration files. This is inaccurate: normal querying and filtering is done with `journalctl` options and field matches. I changed Step 3 to show valid `journalctl` examples and limited configuration edits to storage, retention, forwarding, and rsyslog routing behavior.
- The post listed only `514/tcp` for remote logging. RHEL 9 supports rsyslog remote logging over TCP or UDP, depending on configuration. I clarified that the shown firewall command is for TCP and added a note to use `514/udp` for UDP-based remote logging.
- The journald configuration file list omitted drop-in files. I added `/etc/systemd/journald.conf.d/*.conf`, which is the recommended location for local journald overrides.

## Review Notes
The remaining commands and claims are technically valid for RHEL 9. Future improvements could add more practical `journalctl` filters, such as `--grep`, `--until`, `--output=json`, and `_PID=` field matches, but those are enhancements rather than correctness fixes.
