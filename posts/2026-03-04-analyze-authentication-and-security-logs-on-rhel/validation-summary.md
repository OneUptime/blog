# Validation Summary: How to Analyze Authentication and Security Logs on RHEL

## Status
validated

## Post Type
Guide

## Technologies Covered
- Red Hat Enterprise Linux
- OpenSSH sshd logging
- systemd journal and journalctl
- Linux Audit, auditd, ausearch, and aureport
- PAM authentication logs
- sudo logging
- Linux login/session tools: last, who, and w
- grep, awk, sort, uniq, tail, and shell pipelines

## Sources Consulted
- Red Hat Enterprise Linux 7 Security Guide, "Understanding Audit Log Files": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/7/html/security_guide/sec-understanding_audit_log_files
- Red Hat Enterprise Linux 8 Security Hardening, "Auditing the system": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/8/html/security_hardening/auditing-the-system_security-hardening
- Red Hat Audit System Reference: https://api.access.redhat.com/articles/4409591
- journalctl(1) manual page: https://man7.org/linux/man-pages/man1/journalctl.1.html
- ausearch(8) manual page: https://man7.org/linux/man-pages/man8/ausearch.8.html
- aureport(8) manual page: https://man7.org/linux/man-pages/man8/aureport.8.html
- Local command help for journalctl, last, who, and w

## Issues Found
- The journalctl command for failed SSH attempts used `-p err`, which filters the journal to error-priority messages and can miss normal OpenSSH failed-password entries. Changed it to search the sshd unit logs for the time window without the priority filter.
- The group membership audit command used `ADD_GROUP,DEL_GROUP`, which detect group creation and deletion rather than group account attribute changes. Changed it to `GRP_MGMT`, the audit record type for user-space group account attribute modification.

## Review Notes
The awk field extraction examples match common RHEL/OpenSSH `/var/log/secure` message formats for both normal and invalid-user failed password lines. The exact availability and content of audit events depends on auditd/PAM configuration and whether the relevant audit packages are installed.
