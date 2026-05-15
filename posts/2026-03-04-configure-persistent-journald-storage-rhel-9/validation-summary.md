# Validation Summary: How to Configure Persistent Journald Storage on RHEL 9

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- systemd-journald
- journald.conf
- journalctl
- rsyslog
- firewalld
- SELinux troubleshooting tools

## Sources Consulted
- Red Hat Enterprise Linux 9 documentation: Configuring persistent logging by using the journald RHEL system role - https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/automating_system_administration_by_using_rhel_system_roles/configuring-the-systemd-journal-by-using-the-journald-rhel-system-role_automating-system-administration-by-using-rhel-system-roles
- Red Hat Enterprise Linux 9 documentation: Troubleshooting problems by using log files - https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/configuring_basic_system_settings/assembly_troubleshooting-problems-using-log-files_configuring-basic-system-settings
- Red Hat Enterprise Linux 9 documentation: Configuring a remote logging solution - https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/security_hardening/assembly_configuring-a-remote-logging-solution_security-hardening
- systemd journald.conf manual - https://www.freedesktop.org/software/systemd/man/249/journald.conf.html
- Local system manual pages for `journald.conf`, `journalctl`, `systemctl`, and `rsyslogd`

## Issues Found
- The original configuration step did not show the required `Storage=persistent` setting. Added the correct `[Journal]` configuration snippet for `/etc/systemd/journald.conf`.
- The original post implied that rsyslog configuration files were part of configuring persistent journald storage. Reworded the setup so journald persistence is handled by journald, while rsyslog remains optional for syslog file output and forwarding.
- The original install command installed `rsyslog` and `systemd` even though rsyslog is not required for journald persistence. Updated the command and explanatory text.
- The original restart command suggested restarting either rsyslog or journald. Updated it to restart `systemd-journald` and run `journalctl --flush`, matching the journald persistence workflow.
- The original verification step used `/var/log/messages`, which verifies rsyslog output rather than persistent journal storage. Replaced it with `journalctl --list-boots`.
- The troubleshooting note about ensuring the target directory exists was too vague. Clarified the `/var/log/journal` behavior for `Storage=auto` versus `Storage=persistent`.

## Review Notes
The firewall commands are syntactically plausible for a remote syslog workflow using TCP port 514, but remote logging can also require UDP or TLS-specific ports depending on the rsyslog configuration. The post correctly keeps this section conditional.
