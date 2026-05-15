# Validation Summary: How to Find and Remediate World-Writable Files on RHEL

## Status
validated

## Post Type
Tutorial / security hardening guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- Linux file permissions
- GNU find
- chmod
- umask
- Linux Audit daemon auditd
- auditctl, augenrules, and ausearch

## Sources Consulted
- GNU Findutils manual, File Mode Bits and `-perm`: https://www.gnu.org/software/findutils/manual/html_mono/find.html
- Linux man-pages, `chmod(2)` / `fchmod(2)` / `fchmodat(2)`: https://man7.org/linux/man-pages/man2/fchmod.2.html
- Linux Audit `auditctl(8)` manual: https://man7.org/linux/man-pages/man8/auditctl.8.html
- Red Hat Enterprise Linux 9 Security hardening documentation, audit rules and `augenrules --load`: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/security_hardening/security_hardening

## Issues Found
- The auditd command used `-F a1&0002` unquoted in a shell command. In a shell, `&` is a control operator, so the command would be split and fail. I changed the immediate `auditctl` examples to quote the bit-mask filters.
- The auditd rule grouped `chmod`, `fchmod`, and `fchmodat` under the same `a1` argument filter. `chmod` and `fchmod` take the mode as their second syscall argument (`a1`), but `fchmodat` takes the mode as its third argument (`a2`). I split the rules so `fchmodat` uses `a2&0002`.
- The persistent audit rule example appended a single incorrect rule and then restarted `auditd`. I changed it to append the corrected rule set and load rules with `augenrules --load`, matching Red Hat's RHEL 9 audit rule workflow.

## Review Notes
The `find`, `chmod`, sticky bit, and umask examples are technically correct for RHEL/GNU userland. The `find / -xdev` examples intentionally stay on the filesystem containing `/`; systems with separate local filesystems such as `/var` or `/home` may need additional scan roots.
