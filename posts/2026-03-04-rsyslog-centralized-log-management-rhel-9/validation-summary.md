# Validation Summary: How to Configure rsyslog for Centralized Log Management on RHEL 9

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- rsyslog
- systemd-journald
- firewalld
- SELinux troubleshooting

## Sources Consulted
- Red Hat Enterprise Linux 9 documentation: Configuring a remote logging solution: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/security_hardening/assembly_configuring-a-remote-logging-solution_security-hardening
- Red Hat Enterprise Linux 9 documentation: Services handling syslog messages: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/configuring_basic_system_settings/assembly_troubleshooting-problems-using-log-files_configuring-basic-system-settings
- rsyslog documentation: Configuration checking with `rsyslogd -N1`: https://www.rsyslog.com/how-can-i-check-the-config/
- firewalld documentation: `firewall-cmd --add-port`: https://firewalld.org/documentation/man-pages/firewall-cmd.html
- systemd documentation: journald forwarding and syslog integration: https://www.freedesktop.org/software/systemd/man/journald.conf.html

## Issues Found
- The package installation command installed `systemd` as if it were an rsyslog setup dependency. systemd-journald is part of systemd on RHEL 9, but the package that needs checking for remote logging is `rsyslog`, so the command was changed to `sudo dnf install -y rsyslog`.
- The post claimed to configure centralized rsyslog logging but did not include the required server listener or client forwarding configuration. Added minimal RHEL 9-compatible rsyslog TCP server and client snippets using `imtcp`, `omfile`, `omfwd`, and port `514`.
- The restart step did not validate rsyslog syntax before restarting. Added `sudo rsyslogd -N1`, which is the documented rsyslog configuration check command.
- The verification step only checked local logs. Added a `logger` test message and a check for files under `/var/log/remote` to verify centralized log receipt.

## Review Notes
- The post now documents unencrypted TCP syslog forwarding. For production environments that require confidentiality or stronger delivery guarantees, Red Hat documents TLS-encrypted forwarding and RELP as follow-up options.
