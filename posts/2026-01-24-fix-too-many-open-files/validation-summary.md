# Validation Summary: How to Fix 'Too Many Open Files' Errors in Linux

## Status
validated

## Post Type
Tutorial / troubleshooting guide

## Technologies Covered
- Linux file descriptors and resource limits
- `/proc/sys/fs/file-max`, `/proc/sys/fs/file-nr`, and sysctl
- Bash `ulimit`
- Linux-PAM `limits.conf` and `pam_limits.so`
- systemd service resource limits
- Docker and Docker Compose ulimits
- Nginx worker file descriptor and connection settings
- MySQL/MariaDB open file and table cache settings
- `lsof` and `/proc/<pid>/fd` diagnostics

## Sources Consulted
- Linux man-pages: `proc_sys_fs(5)` - https://man7.org/linux/man-pages/man5/proc_sys_fs.5.html
- Linux man-pages: `limits.conf(5)` - https://man7.org/linux/man-pages/man5/limits.conf.5.html
- Linux man-pages: `getrlimit(2)` - https://man7.org/linux/man-pages/man2/getrlimit.2.html
- Linux man-pages: `errno(3)` - https://man7.org/linux/man-pages/man3/errno.3.html
- Bash built-in help for `ulimit`
- systemd.exec documentation - https://www.freedesktop.org/software/systemd/man/systemd.exec.html
- Docker `dockerd` CLI reference - https://docs.docker.com/reference/cli/dockerd/
- Docker Compose services reference - https://docs.docker.com/reference/compose-file/services/#ulimits
- Nginx core module documentation - https://nginx.org/en/docs/ngx_core_module.html
- MySQL server system variables reference - https://dev.mysql.com/doc/refman/9.7/en/server-system-variables.html
- MySQL table cache documentation - https://dev.mysql.com/doc/refman/9.7/en/table-cache.html

## Issues Found
- Clarified that per-process descriptor exhaustion returns EMFILE, while the system-wide `/proc/sys/fs/file-max` limit is associated with ENFILE. This avoids implying that all "Too many open files" errors have the same limit source.
- Changed the system-wide limit description from "Total FDs" to "Total file handles" to match Linux `/proc/sys/fs/file-max` terminology more closely.
- Qualified the very large `fs.file-max` example as applying to some modern systems, because defaults vary by kernel and distribution.
- Added a note that the second `/proc/sys/fs/file-nr` field is always zero on Linux 2.6 and later, matching the Linux man-pages documentation.
- Fixed the per-process FD count command from `ls -la /proc/PID/fd | wc -l` to `ls -1 /proc/PID/fd 2>/dev/null | wc -l`, because `ls -la` also counts the `total`, `.`, and `..` entries.
- Updated `lsof` aggregation examples to skip the header row so the reported counts are not polluted by the column headings.
- Replaced a hard-coded systemd service file path with a placeholder based on `systemctl show -p FragmentPath`, because the actual unit path varies by distribution and package.
- Made the systemd verification command robust when `pgrep -f 'nginx: master'` returns multiple processes by selecting the first PID before reading `/proc/<pid>/limits`.

## Review Notes
The remaining examples are technically valid, but several settings are workload- and distribution-dependent. In particular, PAM stack filenames differ outside Debian/Ubuntu-family systems, and Nginx/MySQL file descriptor tuning should be sized against actual worker counts, connection limits, table cache settings, and service-manager limits.
