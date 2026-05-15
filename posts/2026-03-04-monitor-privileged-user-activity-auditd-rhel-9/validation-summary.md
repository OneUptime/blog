# Validation Summary: How to Monitor Privileged User Activity Using auditd on RHEL

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- Linux Audit system
- auditd, auditctl, augenrules
- ausearch and aureport
- PAM TTY auditing with pam_tty_audit
- Bash and cron

## Sources Consulted
- Red Hat Enterprise Linux 9 Security hardening, "Auditing the system": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/security_hardening/auditing-the-system_security-hardening
- Red Hat Enterprise Linux 9 Security hardening, "Monitoring user login times with Audit": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/security_hardening/security_hardening
- audit.rules(7) Linux manual page: https://man7.org/linux/man-pages/man7/audit.rules.7.html
- auditctl(8) Linux manual page: https://man7.org/linux/man-pages/man8/auditctl.8.html
- aureport(8) Linux manual page: https://man7.org/linux/man-pages/man8/aureport.8.html
- pam_tty_audit(8) Linux-PAM manual page: https://man.he.net/man8/pam_tty_audit

## Issues Found
- The introduction overstated auditd's coverage as a record of "everything" privileged users do. Changed it to describe a detailed audit trail for privileged program execution and sensitive file access.
- The root command rules only covered `execve`, which misses `execveat`. Added `execveat` to the execution rules.
- The privilege escalation comment said the rule compared effective UID to audit UID, but the rule actually compares real UID and effective UID with `-C uid!=euid`. Corrected the comment.
- Several executable path rules omitted `arch`, which is discouraged for performance and syscall matching clarity on bi-arch systems. Added both `arch=b64` and `arch=b32` variants.
- The RHEL package-management rule used `path=/usr/bin/dnf`. Red Hat notes that `dnf` is a symlink on RHEL and audit rules should use the target path. Changed it to `path=/usr/bin/dnf-3`.
- File access rules for `/etc` and `/root` only included 64-bit syscall coverage. Added matching 32-bit rules and included `openat2`.
- The post used deprecated `-w` watch syntax for audit configuration, audit logs, authentication databases, session files, and login configuration. Converted those examples to syscall-style `path` or `dir` rules with `perm` and explicit `arch` fields.

## Review Notes
- `pam_tty_audit.so enable=*` is syntactically valid and matches the post's goal of broad TTY auditing, but the PAM manual recommends using an initial `disable=*` pattern for many daemon PAM configurations to avoid inherited auditing side effects. Future revisions could provide narrower examples for specific administrative accounts.
- The `execve` and `execveat` rules capture executed programs, not shell built-ins that do not invoke a new executable.
