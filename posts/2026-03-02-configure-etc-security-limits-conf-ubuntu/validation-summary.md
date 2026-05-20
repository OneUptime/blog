# Validation Summary: How to Configure /etc/security/limits.conf on Ubuntu

## Status
validated

## Post Type
Tutorial / system administration guide

## Technologies Covered
- Ubuntu
- Linux PAM
- `/etc/security/limits.conf`
- `/etc/security/limits.d/`
- systemd service resource limits
- Linux `/proc` resource limit interfaces
- `ulimit`, `prlimit`, `sysctl`, `lsof`, and `pgrep`

## Sources Consulted
- Linux-PAM `limits.conf(5)` manual: https://man7.org/linux/man-pages/man5/limits.conf.5.html
- Linux-PAM `pam_limits(8)` manual: https://man7.org/linux/man-pages/man8/pam_limits.8.html
- systemd `systemd.exec(5)` manual: https://man7.org/linux/man-pages/man5/systemd.exec.5.html
- systemd `systemd-system.conf(5)` manual: https://man7.org/linux/man-pages/man5/systemd-system.conf.5.html
- systemd `systemctl(1)` manual: https://man7.org/linux/man-pages/man1/systemctl.1.html
- Linux `getrlimit(2)` manual: https://man7.org/linux/man-pages/man2/getrlimit.2.html
- Linux `proc_sys_fs(5)` manual: https://man7.org/linux/man-pages/man5/proc_sys_fs.5.html
- Linux kernel `/proc/sys/fs` sysctl documentation: https://docs.kernel.org/admin-guide/sysctl/fs.html
- procps-ng `sysctl(8)` manual: https://man7.org/linux/man-pages/man8/sysctl.8.html
- Bash `ulimit` builtin help from the local shell

## Issues Found
- The PAM check for SSH expected `pam_limits.so` directly in `/etc/pam.d/sshd`. On Ubuntu, `sshd` commonly includes the common session files instead, so I changed the commands and explanation to check `common-session`, `common-session-noninteractive`, and the SSH include.
- The `domain` description said "process UID range". The `limits.conf(5)` syntax supports UID ranges and GID ranges, so I corrected that wording.
- The hard-limit description implied root only lowers limits. I simplified it to the important rule that non-root users cannot raise above the hard limit.
- The `rss` item did not mention that the resident set size limit is ignored on modern Linux. I added that caveat.
- The `/etc/security/limits.d/` processing order was reversed. `pam_limits(8)` reads `/etc/security/limits.conf` first, then `limits.d/*.conf` in C-locale order, so I corrected the sentence.
- The system-wide file descriptor section said per-user `nofile` limits cannot exceed `fs.file-max`. `getrlimit(2)` documents `/proc/sys/fs/nr_open` as the ceiling for `RLIMIT_NOFILE`; `fs.file-max` is the system-wide file handle allocation limit. I corrected that distinction.
- Two process-inspection commands used plain `pgrep`, which can return multiple PIDs and break command arguments. I changed them to `pgrep -o` for a single representative process.

## Review Notes
The article is technically relevant and mostly accurate after the corrections. Default resource limits can vary by Ubuntu release, shell/session type, container environment, and systemd manager defaults, so future updates could make the defaults table explicitly version- or environment-scoped.
