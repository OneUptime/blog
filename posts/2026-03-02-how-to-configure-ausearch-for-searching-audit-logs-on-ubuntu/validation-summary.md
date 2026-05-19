# Validation Summary: How to Configure ausearch for Searching Audit Logs on Ubuntu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ubuntu
- Linux Audit System
- auditd
- ausearch
- aureport
- Linux audit logs

## Sources Consulted
- Ubuntu 24.04 LTS ausearch(8) man page: https://manpages.ubuntu.com/manpages/noble/man8/ausearch.8.html
- Ubuntu 24.04 LTS aureport(8) man page: https://manpages.ubuntu.com/manpages/noble/man8/aureport.8.html
- Upstream ausearch(8) man page from Linux Audit userspace: https://man7.org/linux/man-pages/man8/ausearch.8.html
- Upstream aureport(8) man page from Linux Audit userspace: https://man7.org/linux/man-pages/man8/aureport.8.html
- Red Hat documentation, "Searching the Audit Log Files": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/7/html/security_guide/sec-searching_the_audit_log_files

## Issues Found
- Corrected the basic usage comment for `sudo ausearch -ts today`; `today` means since midnight, not the last hour.
- Replaced unsupported `month-ago` time keyword with the documented `this-month` keyword.
- Corrected checkpoint usage to include `--checkpoint`; `-ts checkpoint` uses a timestamp from a valid checkpoint file.
- Changed date examples from ISO-style `YYYY-MM-DD` strings to documented locale-dependent short-date examples, using `MM/DD/YYYY` as the en_US example shown in the man pages.
- Corrected effective UID searches from `-ua` to `-ue`; `-ua` matches UID, effective UID, or login UID.
- Replaced `--exit -1` as a generic failure filter with `--success no`; `--exit -1` only matches a specific syscall exit value/errno.
- Corrected the login-session example from `-se 42` to `--session 42`; `-se` searches SELinux context.
- Corrected the rotated-log example so `-if /var/log/audit` matches the comment about searching the log directory, including rotated logs.

## Review Notes
The examples assume corresponding audit rules and keys already exist, so commands using keys such as `identity-files` or `setuid-execution` will only return results on systems configured with those labels.
