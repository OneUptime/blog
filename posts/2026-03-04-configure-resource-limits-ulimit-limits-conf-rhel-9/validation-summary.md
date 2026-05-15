# Validation Summary: How to Configure Resource Limits with ulimit and limits.conf on RHEL

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Red Hat Enterprise Linux
- Linux resource limits
- Bash `ulimit`
- PAM `pam_limits`
- `/etc/security/limits.conf` and `/etc/security/limits.d/`
- systemd service resource limits
- Linux `/proc/sys/fs` kernel tunables

## Sources Consulted
- Bash `ulimit` builtin help (`help ulimit`)
- Linux-PAM `limits.conf(5)` man page
- Linux-PAM `pam_limits(8)` man page
- Linux `getrlimit(2)` man page
- Linux `proc_sys_fs(5)` man page
- systemd `systemd.exec(5)` man page
- Red Hat Customer Portal: "How to set or change the default soft or hard limit for the number of user's processes?" https://access.redhat.com/solutions/406663
- Red Hat Enterprise Linux 9 documentation: "Using systemd to manage resources used by applications" https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/monitoring_and_managing_system_status_and_performance/assembly_using-systemd-to-manage-resources-used-by-applications_monitoring-and-managing-system-status-and-performance
- Red Hat Customer Portal: "All about resource limits: ulimit, pam_limits.so, /etc/limits.conf, and /etc/limits.d/" https://access.redhat.com/articles/546543

## Issues Found
- The post said only root can raise hard limits. Updated this to include processes with `CAP_SYS_RESOURCE`, matching `getrlimit(2)`.
- The post described `nproc` as a simple per-user process count. Updated wording to clarify Linux enforces it for processes/threads by real user ID.
- The `ulimit -f` description said "blocks" without a size. Updated it to "KB / 1024-byte blocks" to match Bash `ulimit` units.
- The temporary hard-limit example used `sudo bash -c 'ulimit -Hn 131072'`, which only affects a short-lived subshell. Updated it to show setting the value in a root shell for that shell and its children.
- The post said RHEL ships `/etc/security/limits.d/20-nproc.conf`. Updated this because Red Hat documents that RHEL 8 and RHEL 9 do not install that file by default.
- The verification example used `sudo -u appuser bash -c 'ulimit -a'`, which is not a reliable login-session/PAM check. Updated it to use a login shell with `sudo -iu appuser bash -lc 'ulimit -a'`.
- The system-wide file-limit section implied `fs.file-max` is the per-user `nofile` ceiling. Updated it to distinguish `fs.file-max` as the system-wide file-handle limit and `fs.nr_open` as the per-process `nofile` ceiling.

## Review Notes
The systemd examples are syntactically valid, but `systemd.exec(5)` notes that `TasksMax=` is often a better service-level control than `LimitNPROC=` because `LimitNPROC=` is counted by real UID and is not enforced for root services. The post already focuses on classic resource limits, so no new section was added.
