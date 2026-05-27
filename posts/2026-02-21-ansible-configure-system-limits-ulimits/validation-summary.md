# Validation Summary: How to Use Ansible to Configure System Limits (ulimits)

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible
- community.general.pam_limits
- ansible.posix.sysctl
- Linux PAM limits
- Linux resource limits / ulimit
- systemd service limits
- Linux sysctl fs.file-max and fs.file-nr

## Sources Consulted
- Ansible community.general.pam_limits module documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/general/pam_limits_module.html
- Ansible ansible.posix.sysctl module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/posix/sysctl_module.html
- Linux-PAM limits.conf(5) manual page: https://man7.org/linux/man-pages/man5/limits.conf.5.html
- Linux-PAM pam_limits(8) manual page: https://man7.org/linux/man-pages/man8/pam_limits.8.html
- Linux getrlimit(2) manual page: https://man7.org/linux/man-pages/man2/getrlimit.2.html
- systemd.exec manual page: https://www.freedesktop.org/software/systemd/man/systemd.exec.html
- systemd-system.conf manual page: https://www.freedesktop.org/software/systemd/man/systemd-system.conf.html
- systemctl manual page: https://www.freedesktop.org/software/systemd/man/systemctl.html
- Linux kernel /proc/sys/fs documentation: https://www.kernel.org/doc/html/v6.8/admin-guide/sysctl/fs.html

## Issues Found
- The post said systemd limits "override" PAM limits and that limits need to be set in both places. I changed this to clarify that PAM limits apply to login sessions, while systemd service limits apply to services started by systemd.
- The systemd playbook only reloaded systemd after writing service drop-ins. I added a service restart handler because `daemon-reload` makes systemd reread unit configuration, but running service processes do not receive new resource limits until restarted.
- The common mistake section said `systemctl daemon-reload` was enough for changes to take effect. I updated it to require both `daemon-reload` and restarting affected services.
- The verification playbook used `become: true`, which checks the root/become context and can mislead readers when validating PAM login-session limits. I changed it to `become: false` and added a note to reconnect or start a fresh login session before verification.

## Review Notes
The Ansible module names and parameters used in the examples are current and valid according to the official Ansible collection documentation. Service names such as `postgresql` and `redis-server` can vary by distribution, so readers may need to adjust those names for their target hosts.
