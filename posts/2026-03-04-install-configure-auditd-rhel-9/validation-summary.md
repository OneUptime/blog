# Validation Summary: How to Install and Configure auditd on RHEL for System Auditing

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- Linux Audit system
- auditd
- auditctl
- augenrules
- ausearch
- aureport
- auditd.conf

## Sources Consulted
- Red Hat Enterprise Linux 9 Security hardening: Auditing the system: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/security_hardening/auditing-the-system_security-hardening
- Red Hat Enterprise Linux 9 Security hardening: Using auditctl and persistent audit rules: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/epub/security_hardening/using-augenrules-to-define-persistent-rules_auditing-the-system
- auditd.conf(5) man page: https://www.mankier.com/5/auditd.conf
- auditctl(8) man page: https://www.mankier.com/8/auditctl
- audit.rules(7) man page: https://www.mankier.com/7/audit.rules
- ausearch(8) man page: https://www.mankier.com/8/ausearch
- aureport(8) man page: https://www.mankier.com/8/aureport

## Issues Found
- The post used `systemctl start auditd`. Red Hat documents `service auditd start` as the correct way to start auditd and says `systemctl` should only be used for `enable` and `status`. Updated the start command.
- The post described `auditctl -R /etc/audit/rules.d/audit.rules` as a way to signal a daemon reload. `auditctl -R` reads rules from a file, and the path shown is not the generated rules file path. Updated the command to `auditctl --signal reload`.
- The `max_log_file` setting was described as MB. The auditd.conf man page defines this value in mebibytes (MiB). Updated the comment.
- The syscall example claimed to monitor deletions "by root", but `auid=0` matches root login sessions. Updated the wording to avoid implying it catches every effective-root process.
- The verification step modified `/etc/passwd` with `touch`. Although this can produce an audit event, it is unnecessarily risky for a tutorial. Replaced it with a temporary file watch and modification.

## Review Notes
- The post uses `-w` file watch syntax, which still works and is shown in Red Hat examples, but auditctl documentation notes that the `-w` form is deprecated in favor of syscall-style path or directory rules for better performance.
- The system-call examples only show `arch=b64`. On bi-arch systems, separate `b32` rules may be needed if 32-bit syscall coverage is required.
