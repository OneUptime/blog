# Validation Summary: How to Troubleshoot SELinux Denials Using sealert and ausearch on RHEL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux 9
- SELinux
- Linux Audit and `ausearch`
- `sealert` and `setroubleshoot`
- SELinux policy utilities: `semanage`, `restorecon`, `setsebool`, `audit2allow`
- systemd and journald

## Sources Consulted
- Red Hat Enterprise Linux 9 Using SELinux — SELinux states and modes: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/using_selinux/index
- Red Hat Enterprise Linux 9 Using SELinux — Troubleshooting problems related to SELinux: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/using_selinux/index
- `ausearch(8)` Linux manual page: https://man7.org/linux/man-pages/man8/ausearch.8.html
- `sealert(8)` manual page: https://www.mankier.com/8/sealert
- Red Hat Customer Portal excerpt showing RHEL 9 `setroubleshootd.service` as a static unit: https://access.redhat.com/solutions/7101131

## Issues Found
- The prerequisites installed `setroubleshoot-server` and `setools-console`, but omitted `policycoreutils-python-utils`, which Red Hat documents as a prerequisite for the `sealert` troubleshooting workflow and which provides `semanage`. Added a `dnf install` command for `policycoreutils-python-utils`.
- The `ausearch -m avc -ts "1 hour ago"` example used a GNU date-style relative expression that is not documented as an `ausearch --start` time keyword. Replaced it with `ausearch -m avc -ts 13:00:00`, a documented form for searching from a specific time today.
- The post piped `ausearch` output into `sealert -a -`, but the documented `sealert -a` option analyzes a log file, while `sealert -l "*"` is the documented lookup form for processed alerts. Replaced the piped examples with `sudo sealert -l "*"`.
- The post used `systemctl enable --now setroubleshootd`, but RHEL 9 exposes `setroubleshootd.service` as a static service unit, so enabling it is not the right operation. Replaced the command with `systemctl start setroubleshootd`.

## Review Notes
- The broader troubleshooting flow is accurate: identify AVC denials with `ausearch`, analyze them with `sealert`, prefer label/boolean/port fixes, and reserve custom policy generation for cases where simpler configuration fixes do not apply.
- Red Hat documentation recommends checking `AVC,USER_AVC,SELINUX_ERR,USER_SELINUX_ERR` message types for comprehensive SELinux troubleshooting. The post focuses on `avc`, which is valid for common AVC denials but less complete than Red Hat's broader diagnostic command.
