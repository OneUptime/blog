# Validation Summary: How to Use the Ansible reboot Module Safely

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible playbooks
- `ansible.builtin.reboot`
- `ansible.windows.win_reboot`
- Debian/Ubuntu APT reboot detection
- RHEL/CentOS `needs-restarting`
- systemd and `systemctl`
- Linux server operations and rolling reboots
- WinRM for Windows management

## Sources Consulted
- Ansible `ansible.builtin.reboot` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/reboot_module.html
- Ansible `ansible.windows.win_reboot` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/windows/win_reboot_module.html
- Ansible `ansible.builtin.apt` module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/apt_module.html
- Ansible playbook keyword documentation: https://docs.ansible.com/ansible/latest/reference_appendices/playbooks_keywords.html
- Ansible `ansible.builtin.systemd_service` documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/systemd_service_module.html
- Debian Policy Manual, reboot-required mechanism: https://www.debian.org/doc/debian-policy/ch-opersys.html#signaling-that-a-reboot-is-required
- DNF `needs-restarting` plugin documentation: https://dnf-plugins-core.readthedocs.io/en/latest/needs_restarting.html
- Red Hat reboot-required package guidance: https://access.redhat.com/solutions/27943
- systemd `systemctl` manual: https://www.freedesktop.org/software/systemd/man/latest/systemctl.html

## Issues Found
- Corrected the `pre_reboot_delay` explanation. The Ansible reboot module accepts seconds, but on Linux, macOS, and OpenBSD it converts the value to minutes and rounds down, so the previous `pre_reboot_delay: 5` example would effectively be 0 on Linux. Changed the production example to `pre_reboot_delay: 60` and clarified the explanation.
- Corrected the `connect_timeout` default. The built-in reboot module uses the underlying connection plugin default when unspecified, not a fixed 5 seconds.
- Corrected the `reboot_timeout` description to note that Ansible evaluates it separately for reboot verification and test command success.
- Corrected the `reboot_command` description. When a custom reboot command is set, Ansible ignores `pre_reboot_delay`, `post_reboot_delay`, and `msg`.
- Corrected the `systemctl is-system-running --wait` explanation. It may wait until `running` or `degraded`, but it returns success only when the system is fully running with no failed services.
- Corrected the Windows reboot section. `ansible.builtin.reboot` is for POSIX targets; Windows hosts should use `ansible.windows.win_reboot`.

## Review Notes
The remaining examples are technically plausible but intentionally environment-specific, especially the load balancer API URLs, service names, application health endpoint, and PagerDuty webhook payload. They should be adapted to the user's infrastructure before use.
