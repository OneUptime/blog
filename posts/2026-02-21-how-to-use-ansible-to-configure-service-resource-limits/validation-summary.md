# Validation Summary: How to Use Ansible to Configure Service Resource Limits

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible
- systemd unit files
- systemd resource control
- Linux cgroups
- Linux process resource limits / ulimits
- Linux-PAM limits.conf

## Sources Consulted
- systemd.exec official documentation: https://www.freedesktop.org/software/systemd/man/latest/systemd.exec.html
- systemd.resource-control official documentation: https://www.freedesktop.org/software/systemd/man/latest/systemd.resource-control.html
- systemd-system.conf official documentation: https://www.freedesktop.org/software/systemd/man/latest/systemd-system.conf.html
- systemctl official documentation: https://www.freedesktop.org/software/systemd/man/latest/systemctl.html
- Ansible ansible.builtin.template documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/template_module.html
- Ansible ansible.builtin.copy documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/copy_module.html
- Ansible ansible.builtin.systemd_service documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/systemd_service_module.html
- Linux-PAM limits.conf manual: https://man7.org/linux/man-pages/man5/limits.conf.5.html
- Linux-PAM pam_limits manual: https://man7.org/linux/man-pages/man8/pam_limits.8.html

## Issues Found
- Clarified that `/etc/security/limits.conf` is applied by PAM to login sessions, while systemd services should use `LimitXXX` directives in unit files.
- Corrected the `LimitNPROC` explanation. systemd documents it as a per-real-UID process limit, not a per-service process/thread limit; `TasksMax` is the per-service cgroup-based control.
- Fixed the cgroup template so examples that pass `svc_limit_nofile` actually render `LimitNOFILE`.
- Updated the summary to avoid implying that `LimitNPROC` is the preferred service-level process count control.

## Review Notes
The systemd resource-control directives and Ansible module usage are otherwise consistent with current official documentation. A sample unit using the covered systemd directives was verified with `systemd-analyze verify` on systemd 255.
