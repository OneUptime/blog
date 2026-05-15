# Validation Summary: How to Set Up Real-Time Alerts from Audit Events on RHEL

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- Linux Audit subsystem
- auditd and audit plugins
- audisp-syslog and af_unix plugins
- ausearch
- systemd services
- Bash scripting
- Email and webhook notifications

## Sources Consulted
- Red Hat Enterprise Linux 9 Security hardening documentation: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/security_hardening/auditing-the-system_security-hardening
- Linux Audit userspace auditd-plugins man page: https://raw.githubusercontent.com/linux-audit/audit-userspace/master/docs/auditd-plugins.5
- Linux Audit userspace audisp-syslog man page: https://raw.githubusercontent.com/linux-audit/audit-userspace/master/audisp/plugins/syslog/audisp-syslog.8
- Linux Audit userspace audisp-af_unix man page: https://raw.githubusercontent.com/linux-audit/audit-userspace/master/audisp/plugins/af_unix/audisp-af_unix.8
- Linux Audit userspace ausearch man page: https://raw.githubusercontent.com/linux-audit/audit-userspace/master/docs/ausearch.8
- RHEL 9 package manifest for audispd-plugins package availability: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/pdf/package_manifest/Red_Hat_Enterprise_Linux-9-Package_manifest-en-US.pdf

## Issues Found
- The examples searched for audit keys such as `sshd_config`, `identity`, `actions`, and `modules`, but the post did not define audit rules that create those keys. Added a minimal `99-alerting.rules` snippet and `augenrules --load` so the examples can generate matching events.
- The post described `audispd` as the active dispatcher on RHEL 9. Red Hat documents that RHEL 9 integrates dispatcher functionality into `auditd`, so the wording was corrected while preserving the same plugin workflow.
- The custom email and webhook scripts used `socat`, `mail`, and `curl` without installing the packages that commonly provide those commands. Added `dnf install` commands for the relevant tools in the affected examples.
- The polling example tracked only a time-of-day string in `/var/run/audit-poll-timestamp`, which can miss or mis-handle events across day boundaries. Replaced it with per-key `ausearch --checkpoint` files, which is the supported mechanism for successive `ausearch` invocations.
- The alert script comment said "sudo usage" while the implemented key and subject were for sudo configuration changes. Corrected the comment to match the behavior.

## Review Notes
The af_unix examples intentionally use string-formatted audit records so the shell scripts can filter with `grep`. For production deployments, a parser based on `auparse` or a SIEM/log agent would be more robust than matching raw audit lines in shell.
