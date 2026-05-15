# Validation Summary: How to Set Up Real-Time Audit Event Processing with audisp Plugins on RHEL

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- Linux Audit framework
- auditd
- audisp audit event dispatcher plugins
- audisp-syslog
- audisp-af_unix
- audisp-remote
- Python
- Bash
- Syslog

## Sources Consulted
- Red Hat Enterprise Linux 9 Security hardening documentation, "Auditing the system": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/security_hardening/auditing-the-system_security-hardening
- Red Hat Enterprise Linux 9 Security hardening documentation, audit dispatcher integration and plugin directory: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/pdf/security_hardening/checking-integrity-with-aide_security-hardening
- RHEL 9.2 `auditd-plugins(5)` manual page mirror: https://www.mywebuniversity.com/RedHat_92/Man_PDF/auditd-plugins.5.pdf
- `audisp-syslog(8)` manual page from the Linux audit userspace package: https://man.archlinux.org/man/core/audit/audisp-syslog.8.en
- `audisp-af_unix(8)` manual page: https://manpages.debian.org/trixie/auditd/audisp-af_unix.8.en.html
- `audisp-remote(8)` manual page: https://www.mankier.com/8/audisp-remote

## Issues Found
- The post said "Starting with RHEL" for the audisp dispatcher being integrated into `auditd`. Red Hat documents this behavior for RHEL 8 and RHEL 9, so the wording was changed to "Starting with RHEL 8" for version accuracy.
- The plugin `type` field description was too broad. It now states that `builtin` is for internal plugins such as `af_unix`, while `always` is for external plugin executables.
- The syslog `args` explanation incorrectly presented `LOG_WARNING` as a syslog facility. The `audisp-syslog(8)` manual documents separate facility and level options, so the text now describes `LOG_LOCAL6 LOG_INFO` and `LOG_LOCAL6 LOG_WARNING` examples.

## Review Notes
The Python and Bash examples are syntactically valid and match the audit plugin model where external plugins receive event records on standard input. The examples are suitable for demonstration, but production plugins should add stronger error handling, backpressure handling, and secret management for SIEM API keys.
