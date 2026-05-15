# Validation Summary: How to Write Custom Audit Rules for File Access Monitoring on RHEL

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- Linux Audit system
- auditd
- auditctl audit rules
- augenrules
- ausearch
- aureport

## Sources Consulted
- Red Hat Enterprise Linux 9 Security hardening, "Auditing the system": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/security_hardening/auditing-the-system_security-hardening
- Linux Audit `auditctl(8)` man page: https://man7.org/linux/man-pages/man8/auditctl.8.html
- Linux Audit `audit.rules(7)` man page: https://man7.org/linux/man-pages/man7/audit.rules.7.html
- Linux Audit `augenrules(8)` man page: https://www.man7.org/linux/man-pages/man8/augenrules.8.html
- Linux Audit `ausearch(8)` man page: https://man7.org/linux/man-pages/man8/ausearch.8.html
- Linux Audit `aureport(8)` man page: https://man7.org/linux/man-pages/man8/aureport.8.html

## Issues Found
- The post presented `-w` file watch rules as the simple form without noting that the upstream `auditctl(8)` man page deprecates the `-w`/`-p` watch syntax for new rules due to performance concerns. I added a caveat that RHEL documentation still shows the form, but syscall rules with `path` or `dir` and `perm` filters are preferred when performance matters.
- The "Monitoring Access by Specific Users" examples said they monitored all file operations, but the listed syscalls only monitored file-open activity. I changed the comments to "file open operations" and added `openat2` for current RHEL 9-era kernels.
- The examples used `auid!=4294967295` to exclude unset login UIDs. This is valid, but the `audit.rules(7)` man page recommends the clearer equivalent `auid!=unset`; I changed that example to use `unset`.
- The loading section described `augenrules --check` as a syntax-error check. The `augenrules(8)` man page says `--check` tests whether generated rules differ and need updating without overwriting `audit.rules`, so I corrected the comment.

## Review Notes
The remaining commands and rule syntax are consistent with RHEL 9 documentation and Linux Audit man pages. Some example watched paths, such as database or application directories, are environment-dependent and must exist for watch rules to load cleanly.
