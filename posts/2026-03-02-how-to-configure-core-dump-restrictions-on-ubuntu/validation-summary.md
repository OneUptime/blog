# Validation Summary: How to Configure Core Dump Restrictions on Ubuntu

## Status
validated

## Post Type
Tutorial / security hardening guide

## Technologies Covered
- Ubuntu
- Linux kernel core dumps
- sysctl and procfs
- PAM limits
- systemd-coredump
- systemd service unit overrides
- Bash
- C/C++ RLIMIT_CORE
- Python resource module

## Sources Consulted
- Linux `core(5)` manual page: https://man7.org/linux/man-pages/man5/core.5.html
- Linux `proc_sys_fs(5)` manual page for `/proc/sys/fs/suid_dumpable`: https://man7.org/linux/man-pages/man5/proc_sys_fs.5.html
- Linux `getrlimit(2)` manual page for `RLIMIT_CORE` and `setrlimit`: https://man7.org/linux/man-pages/man2/getrlimit.2.html
- Linux-PAM `limits.conf(5)` and `pam_limits(8)` manual pages: https://man7.org/linux/man-pages/man5/limits.conf.5.html and https://man7.org/linux/man-pages/man8/pam_limits.8.html
- systemd `coredump.conf(5)` and `systemd-coredump(8)` documentation: https://www.freedesktop.org/software/systemd/man/coredump.conf.html and https://www.freedesktop.org/software/systemd/man/systemd-coredump.html
- systemd `systemd.exec(5)` documentation for `LimitCORE=` and `MemoryDenyWriteExecute=`: https://www.freedesktop.org/software/systemd/man/systemd.exec.html
- Ubuntu OpenSSH Server documentation: https://ubuntu.com/server/docs/how-to/security/openssh-server/

## Issues Found
- The `fs.suid_dumpable` value descriptions were inaccurate. I corrected value `1` to describe insecure user-owned dumps and value `2` to describe root-readable dumps.
- The PAM limits section implied `/etc/security/limits.d/` applies to services that do not use PAM. I corrected it to state that PAM limits apply to login sessions using `pam_limits`, and that `limits.d` is a dedicated location for the same PAM limit rules.
- The systemd-coredump section described `Storage=external` as storing via `core_pattern` and implied `daemon-reload` was needed. I corrected the storage description, clarified `ProcessSizeMax=0` behavior with `Storage=none`, and noted that `coredump.conf` changes apply on the next systemd-coredump invocation.
- The `ExternalSizeMax=` comment described total disk space, but the directive limits individual externally stored core dump size. I corrected the comment.
- The Ubuntu service examples used less appropriate service names (`postgres`, `redis`, and the single-service `sshd` example). I changed them to common Ubuntu systemd units: `ssh`, `postgresql`, and `redis-server`.
- The verification section incorrectly claimed `cat /dev/null` kills itself with `SIGSEGV`. I replaced that with an accurate description of the included null-pointer test program.

## Review Notes
The post is technically sound after the corrections. One future improvement would be to mention that `RLIMIT_CORE` is ignored when core dumps are piped to a handler via `kernel.core_pattern`, which matters for environments using systemd-coredump or a custom pipe handler.
