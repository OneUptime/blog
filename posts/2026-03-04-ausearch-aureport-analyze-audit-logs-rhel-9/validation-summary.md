# Validation Summary: How to Use ausearch and aureport to Analyze Audit Logs on RHEL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux 9
- Linux Audit system
- auditd
- ausearch
- aureport
- SELinux AVC audit records

## Sources Consulted
- Red Hat Enterprise Linux 9 Security hardening documentation: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/security_hardening/security_hardening
- ausearch(8) Linux manual page from audit-userspace: https://man7.org/linux/man-pages/man8/ausearch.8.html
- aureport(8) Linux manual page from audit-userspace: https://man7.org/linux/man-pages/man8/aureport.8.html

## Issues Found
- Corrected the audit log field description for `uid=0` from effective user ID to real user ID. The effective user ID is represented by `euid`.
- Corrected `ausearch` user filters: `-ul` is the login/audit user ID filter, `-ue` is the effective user ID filter, and `-ua` matches any of user ID, effective user ID, or login user ID.
- Corrected the description of `-ts recent` from the last hour to the last 10 minutes.
- Updated SELinux denial search to include the AVC-related message types shown in the `ausearch(8)` examples.
- Changed repeated account-change message filters to a comma-separated `-m` list, matching the documented message-type list syntax.
- Removed the implication that `aureport --comm` reports only commands executed with sudo; it reports commands run.
- Replaced a multi-key `ausearch` example with a single key search because `ausearch` options are combined as AND conditions except for documented exceptions such as `-m` and `-n`.
- Corrected the best-practice note that claimed an omitted time range searches the entire log history. Red Hat's RHEL documentation states that `ausearch` without `-ts` provides results from today.

## Review Notes
The commands are generally valid for RHEL 9 audit tooling. Date parsing for `-ts` and `-te` is locale-dependent, so examples using numeric dates assume a locale such as `en_US.UTF-8`.
