# Validation Summary: How to Use Ansible to Configure User Resource Limits (ulimit)

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible playbooks
- `community.general.pam_limits`
- `ansible.posix.sysctl`
- Linux PAM and `pam_limits`
- `/etc/security/limits.conf` and `/etc/security/limits.d/`
- systemd service resource limits
- Linux sysctl kernel parameters

## Sources Consulted
- Ansible `community.general.pam_limits` module documentation: https://docs.ansible.com/ansible/latest/collections/community/general/pam_limits_module.html
- Ansible `ansible.posix.sysctl` module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/posix/sysctl_module.html
- systemd.exec manual for `LimitNOFILE=`, `LimitNPROC=`, and `LimitMEMLOCK=`: https://www.freedesktop.org/software/systemd/man/systemd.exec.html
- Linux `getrlimit(2)` manual page for soft and hard resource limit semantics: https://man7.org/linux/man-pages/man2/getrlimit.2.html
- Linux `/proc/sys/fs` manual page for `fs.file-max` and `/proc/sys/fs/file-nr`: https://www.man7.org/linux/man-pages/man5/proc_sys_fs.5.html
- Linux kernel sysctl documentation for `kernel.pid_max`: https://www.kernel.org/doc/html/latest/admin-guide/sysctl/kernel.html#pid-max
- Linux `pam_limits(8)` manual page: https://man7.org/linux/man-pages/man8/pam_limits.8.html

## Issues Found
- The resource-limit flow diagram implied separate "over soft limit" and "over hard limit" runtime failure behavior. Soft limits are the current enforced limits; hard limits are the ceiling to which soft limits may be raised. Updated the diagram to show operation failure above the soft limit and note that users may raise soft limits up to hard limits.
- The sysctl example described `kernel.pid_max` as the maximum PID count. The kernel documentation defines it as the PID allocation wrap value. Updated the comment and task name.
- The verification example labeled `/proc/sys/fs/file-nr` as `allocated/free/max`. The Linux manual describes the fields as allocated file handles, free file handles, and maximum file handles. Updated the label to clarify that it refers to free handles.
- The best-practices section said `fs.file-max` directly prevents a user from having a higher `nofile` value. `fs.file-max` is a system-wide file-handle allocation limit, while `RLIMIT_NOFILE` is the per-process descriptor limit. Reworded this to explain that low system-wide limits can still exhaust file handles even when per-user limits are higher.

## Review Notes
- The Ansible examples use current fully qualified collection names and valid module parameters.
- `community.general` and `ansible.posix` are not part of `ansible-core`; target environments need those collections installed.
- systemd documents `TasksMax=` as generally preferable to `LimitNPROC=` for system services, but the shown `LimitNPROC=` directive is valid.
