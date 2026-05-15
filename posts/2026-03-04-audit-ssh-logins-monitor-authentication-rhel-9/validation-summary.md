# Validation Summary: How to Audit SSH Logins and Monitor Authentication Attempts on RHEL

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- OpenSSH sshd
- Linux audit subsystem, auditd, augenrules, ausearch, and aureport
- systemd journal and journalctl
- RHEL authentication logs, /var/log/secure, wtmp, btmp, utmp, and lastlog
- Linux-PAM pam_faillock
- Bash, awk, grep, cron, systemd-cat, and mail

## Sources Consulted
- Red Hat Enterprise Linux 9 Security hardening, "Auditing the system": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/security_hardening/security_hardening
- Red Hat Customer Portal, "Auditd stops loading consecutive rules when an error occurs": https://access.redhat.com/solutions/7001979
- Red Hat Enterprise Linux 9 Configuring basic system settings, logging with systemd-journald and rsyslog: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/htmlsingle/configuring_basic_system_settings/
- Linux-PAM pam_faillock(8): https://man7.org/linux/man-pages/man8/pam_faillock.8.html
- Linux-PAM faillock.conf(5): https://man7.org/linux/man-pages/man5/faillock.conf.5.html
- OpenSSH sshd_config(5): https://man.openbsd.org/sshd_config
- systemd journalctl documentation: https://www.freedesktop.org/software/systemd/man/latest/journalctl.html
- Local command help for journalctl, last, and jq in the review environment.

## Issues Found
- The audit rule example watched optional paths such as /etc/ssh/authorized_keys/ and broad SSH key directories that may not exist on a default RHEL system. Because audit rule loading can fail when a watched path is missing, the example was changed to watch /root/.ssh/authorized_keys and to create the optional watched paths before running augenrules.
- The /var/log/secure command for counting successful logins used awk field $9, which resolves to "from" in common sshd "Accepted ..." log lines rather than the username. It now extracts the token following "for".
- The monitoring scripts extracted source addresses with an IPv4-only regular expression. The expression now captures the address token after "from", so IPv6 SSH clients are included.
- The successful-login report script printed incorrect fixed fields for user, source, and method. It now scans the sshd log line for "Accepted", "for", and "from" tokens and prints the corresponding values.
- The sshd logging recommendation used SyslogFacility AUTH. For RHEL systems where /var/log/secure is commonly populated from authpriv messages, this was changed to AUTHPRIV.

## Review Notes
The remaining commands and configuration examples are technically appropriate for RHEL-style OpenSSH and auditd monitoring. The audit examples assume auditd and audit userspace tools are installed and enabled, and the mail alert example assumes a local mail provider or relay is configured.
