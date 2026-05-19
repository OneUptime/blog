# Validation Summary: How to Configure auditd Rules for File Access Monitoring on Ubuntu

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ubuntu
- Linux Audit System
- auditd
- auditctl
- augenrules
- auditd.conf
- ausearch
- systemd

## Sources Consulted
- Linux audit-userspace project: https://github.com/linux-audit/audit-userspace
- Linux man-pages audit.rules(7): https://man7.org/linux/man-pages/man7/audit.rules.7.html
- Ubuntu auditctl(8) man page: https://manpages.ubuntu.com/manpages/jammy/man8/auditctl.8.html
- Ubuntu auditd.conf(5) man page: https://manpages.ubuntu.com/manpages/focal/man5/auditd.conf.5.html
- Debian auditd.conf(5) man page: https://manpages.debian.org/testing/auditd/auditd.conf.5.en.html

## Issues Found
- The post incorrectly stated that `auditctl -w` directory watches are not recursive and monitor only immediate children. Current audit rules documentation states that directory watches are recursive to the bottom of the directory tree, excluding mount points. Updated the explanation and note accordingly.
- The post advised using syscall rules with `path` fields for subdirectory monitoring and used `path=` for directory examples. Audit documentation distinguishes `path=` for a specific inode/path from `dir=` for a directory tree. Updated the affected examples to use `dir=` where the target is a directory tree.

## Review Notes
The legacy `-w` watch syntax remains supported but audit.rules documentation notes that syscall-style filesystem rules with `path` or `dir` can offer better flexibility and performance, especially when additional filters are needed.
