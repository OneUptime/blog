# Validation Summary: How to Fix 'Too Many Open Files' (ulimit) Errors on RHEL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux
- Linux file descriptors and resource limits
- PAM limits configuration (`limits.conf`, `limits.d`)
- systemd service resource limits
- Linux `/proc` and `sysctl`
- Bash shell commands

## Sources Consulted
- Red Hat Customer Portal, "All about resource limits: ulimit, pam_limits.so, /etc/limits.conf, and /etc/limits.d/" - https://access.redhat.com/articles/546543
- Red Hat Customer Portal, "How to set limits for services in RHEL and systemd" - https://access.redhat.com/solutions/1257953
- Red Hat Enterprise Linux 7 System Administrator's Guide, systemd limits note - https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/7/html/system_administrators_guide/
- Linux-PAM `limits.conf(5)` manual page - https://man7.org/linux/man-pages/man5/limits.conf.5.html
- systemd `systemd.exec(5)` manual page - https://www.freedesktop.org/software/systemd/man/systemd.exec.html
- Linux kernel `/proc/sys/fs` sysctl documentation - https://docs.kernel.org/admin-guide/sysctl/fs.html
- Linux `proc_sys_fs(5)` manual page - https://man7.org/linux/man-pages/man5/proc_sys_fs.5.html

## Issues Found
- The `file-nr` column description used "free" for the second column. Linux documentation describes this as unused file handles, so the comment was changed to `allocated  unused  maximum`.
- The file descriptor counting command used `ls -la ... | wc -l`, which includes `total`, `.` and `..` lines and overcounts. It was changed to `ls -1 ... | wc -l`.
- The user limits section did not explicitly say that `/etc/security/limits.conf` applies to PAM login sessions. A short clarification was added so readers do not expect it to change systemd-managed service limits.

## Review Notes
The systemd `LimitNOFILE=` example is correct for RHEL systemd services. systemd documentation cautions that raising the soft file descriptor limit above 1024 can affect applications that still use `select(2)` instead of `poll(2)` or `epoll(7)`, but the value shown is a common operational setting for modern servers.
