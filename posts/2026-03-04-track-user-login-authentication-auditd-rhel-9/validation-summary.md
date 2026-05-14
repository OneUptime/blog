# Validation Summary: How to Track User Login and Authentication Events with auditd on RHEL

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- Linux audit subsystem
- auditd
- auditctl and augenrules
- ausearch and aureport
- PAM authentication audit events
- auditd plugins
- cron

## Sources Consulted
- Red Hat Enterprise Linux 9 Security hardening: Auditing the system: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/security_hardening/auditing-the-system_security-hardening
- auditctl(8) Linux manual page: https://man7.org/linux/man-pages/man8/auditctl.8.html
- audit.rules(7) Linux manual page: https://man7.org/linux/man-pages/man7/audit.rules.7.html
- ausearch(8) Linux manual page: https://man7.org/linux/man-pages/man8/ausearch.8.html
- aureport(8) Linux manual page: https://man7.org/linux/man-pages/man8/aureport.8.html
- auditd(8) Linux manual page: https://man7.org/linux/man-pages/man8/auditd.8.html
- auditd-plugins(5) Linux manual page: https://man7.org/linux/man-pages/man5/auditd-plugins.5.html
- Red Hat RHEL 8 adoption notes on securetty removal, also applicable background for RHEL 8/9 securetty defaults: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/8/pdf/considerations_in_adopting_rhel_8/infrastructure-services_considerations-in-adopting-rhel-8

## Issues Found
- Replaced deprecated `-w`/`-p` file watch rules with current syscall-style `path`/`dir` and `perm=wa` rules, matching the auditctl documentation's recommended form.
- Removed the `/etc/securetty` audit rule because RHEL 8 and later do not include that file by default unless `pam_securetty` is explicitly configured; keeping the rule could cause rule loading failures on default RHEL 9 systems.
- Clarified that execve rules track execution of login-related programs, not all login and logout events. PAM `USER_LOGIN` records are the correct source for login events.
- Corrected the `--start recent` description so it no longer claims to search the last hour; audit tools define `recent` as roughly the last 10 minutes.
- Corrected failed sudo authentication searching to use PAM audit event types (`USER_AUTH`, `USER_ERR`) instead of filtering the sudo execve rule with `--success no`, which would only find failed process execution.
- Changed `ausearch -x` examples to use full executable paths for `sshd` and `sudo`.
- Added the missing `/etc/audit/plugins.d/auth-alert.conf` configuration and auditd reload command so the alert script is actually invoked by auditd.
- Softened the introductory claim that auditd always captures exact syscalls for every authentication event; auditd can capture related syscall context when rules are configured, while PAM authentication records are separate audit event types.

## Review Notes
- The examples use `arch=b64`, which is appropriate for normal RHEL 9 x86_64 deployments using 64-bit system binaries. Environments that execute 32-bit user-space binaries should add equivalent `arch=b32` rules where applicable, as described in the audit.rules documentation.
