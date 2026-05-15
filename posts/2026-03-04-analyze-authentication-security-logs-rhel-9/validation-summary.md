# Validation Summary: How to Analyze Authentication and Security Logs on RHEL 9

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- systemd-journald
- journalctl
- rsyslog
- firewalld / firewall-cmd
- SELinux audit troubleshooting with ausearch

## Sources Consulted
- Red Hat Enterprise Linux 9 documentation: Configuring basic system settings, logging services and `/var/log` files: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/htmlsingle/configuring_basic_system_settings/
- systemd journalctl manual, options for `--since` and `--facility`: https://www.freedesktop.org/software/systemd/man/254/journalctl.html
- firewalld firewall-cmd manual, `--add-port` and `--permanent`: https://firewalld.org/documentation/man-pages/firewall-cmd.html
- firewalld reload documentation, `firewall-cmd --reload`: https://firewalld.org/documentation/howto/reload-firewalld.html
- rsyslog documentation, configuration validation with `rsyslogd -N1`: https://www.rsyslog.com/doc/getting_started.html
- Red Hat Enterprise Linux 9 documentation: Using SELinux, `ausearch -m AVC... -ts recent`: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/using_selinux/using_selinux

## Issues Found
- The verification command used `tail -20 /var/log/messages`, but Red Hat documents `/var/log/messages` as excluding messages that go to `/var/log/secure`. Changed the example to `tail -20 /var/log/secure` for security and authentication logs.
- The journal verification command showed all recent journal entries instead of authentication/security entries. Changed it to `journalctl --facility=auth,authpriv --since "5 minutes ago"` using journalctl's documented facility filter.
- The firewall step said to open remote logging ports generally while showing only TCP port 514. Clarified that the command applies when the system receives remote logs over TCP.

## Review Notes
The remaining commands and explanations are technically valid for RHEL 9 at the level presented. A future improvement could add concrete rsyslog remote-input configuration examples, but that would be an expansion rather than a correction.
