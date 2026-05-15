# Validation Summary: How to Forward Journal Logs to rsyslog on RHEL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux 9
- systemd-journald
- rsyslog
- firewalld
- SELinux troubleshooting tools

## Sources Consulted
- Red Hat Enterprise Linux 9 documentation, "Troubleshooting problems by using log files": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/configuring_basic_system_settings/assembly_troubleshooting-problems-using-log-files_configuring-basic-system-settings
- Red Hat Enterprise Linux 9 documentation, "Configuring a remote logging solution": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/security_hardening/assembly_configuring-a-remote-logging-solution_security-hardening
- rsyslog official documentation, "imjournal: Systemd Journal Input Module": https://docs.rsyslog.com/doc/configuration/modules/imjournal.html
- systemd journald.conf manual: https://www.freedesktop.org/software/systemd/man/journald.conf.html
- Local manual pages for `journald.conf`, `rsyslog.conf`, and local `rsyslogd -v` output

## Issues Found
- Step 3 implied that forwarding journal logs to rsyslog generally requires editing both rsyslog and journald configuration files. On RHEL, rsyslog normally reads from the journal through `imjournal`; journald `ForwardToSyslog=yes` is a separate socket-forwarding method. I updated Step 3 to describe the `imjournal` path, mention the socket-forwarding alternative, and warn about duplicate messages if both methods are enabled without checking.
- The restart commands used `# or`, which could imply that restarting either service is interchangeable. I changed the comment to restart `systemd-journald` only when `journald.conf` is changed.
- The firewall step did not specify that the port is opened on the receiving log server. I clarified that the example applies to receiving remote logging traffic on the log server.

## Review Notes
The post is now technically correct for a concise RHEL 9 guide. It could be expanded in the future with full remote forwarding examples, but that would be a content expansion rather than a correctness fix.
