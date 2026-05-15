# Validation Summary: How to Audit Privileged Command Execution on RHEL

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- Linux Audit system, auditd, auditctl, augenrules, ausearch, aureport
- sudo and sudoers auditing
- Linux setuid/setgid file permissions
- Shell scripting with find and findmnt

## Sources Consulted
- Red Hat Enterprise Linux 9 Security hardening, "Auditing the system": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/security_hardening/auditing-the-system_security-hardening
- auditctl(8) Linux manual page: https://man7.org/linux/man-pages/man8/auditctl.8.html
- sudoers(5) manual page: https://www.mankier.com/5/sudoers
- RHEL 9 STIG-A-View, RHEL-09-654150 sudo auditing rule: https://stigaview.com/products/rhel9/v2r4/RHEL-09-654150/
- findmnt(8) local manual page
- ausearch(8) manual page references for key search behavior

## Issues Found
- The automated rule generation used `findmnt -it xfs,ext4,ext3`, where `-i` inverts the filesystem type match. Changed it to `findmnt -t xfs,ext4,ext3` so the script searches the intended local filesystem types.
- The generated and manual `path` plus `perm=x` audit rules omitted `arch`. The auditctl manual states that using `perm` without `arch` causes all system calls to be subject to audit and lowers performance. Added `-F arch=b64` to the examples and added conditional `b32` generation for x86_64 in the automated script.
- The sudo-specific execve rules were described as catching commands executed through sudo. In practice, `-C uid!=euid -F euid=0` catches setuid-root program invocations such as sudo itself, not necessarily the target command after sudo has switched credentials. Updated the comment, key, and explanation to describe setuid-root execution accurately.
- The sudo log watch implied that `/var/log/sudo.log` is always present. sudoers logs via syslog by default unless the `logfile` option is set, so the comment now makes that watch conditional on configuring a dedicated sudo logfile.
- The `ausearch -k privileged-su -k privileged-sudo` example would require an event to match both keys. Split it into separate searches so su and sudo events are both retrieved.

## Review Notes
The post remains a practical auditd guide, but production deployments should still align rule sets with the organization's compliance profile and test generated rules on the exact RHEL architecture in use.
