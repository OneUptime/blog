# Validation Summary: How to Use Ansible to Reboot Servers and Wait for Return

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible playbooks
- ansible.builtin.reboot
- ansible.builtin.wait_for and wait_for_connection
- ansible.builtin.systemd_service
- ansible.builtin.dnf
- ansible.posix.sysctl
- Linux shutdown, systemctl, GRUB, and reboot-required checks

## Sources Consulted
- Ansible reboot module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/reboot_module.html
- Ansible wait_for module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/wait_for_module.html
- Ansible wait_for_connection module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/wait_for_connection_module.html
- Ansible systemd_service module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/systemd_service_module.html
- Ansible command module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/command_module.html
- Ansible stat module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/stat_module.html
- Ansible dnf module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/dnf_module.html
- Ansible yum redirect documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/yum_module.html
- Ansible playbook strategy and serial documentation: https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbooks_strategies.html
- Ansible error handling documentation for max_fail_percentage: https://docs.ansible.com/ansible/latest/playbook_guide/playbooks_error_handling.html
- ansible.posix.sysctl module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/posix/sysctl_module.html
- DNF needs-restarting documentation: https://dnf-plugins-core.readthedocs.io/en/stable/needs_restarting.html
- DNF5 needs-restarting documentation: https://dnf5.readthedocs.io/en/latest/dnf5_plugins/needs_restarting.8.html
- systemd systemctl documentation: https://www.freedesktop.org/software/systemd/man/latest/systemctl.html
- Linux shutdown manual reference: https://www.mankier.com/8/shutdown

## Issues Found
- `pre_reboot_delay` was set to 5 and 10 seconds in Linux examples. Ansible passes this value to the target reboot command, and on Linux it is converted to minutes and rounded down, so both values would become 0. Changed both examples to `pre_reboot_delay: 60`.
- The rolling reboot example used `ansible.builtin.systemd`. Updated it to the current documented FQCN, `ansible.builtin.systemd_service`.
- The rolling reboot service wait checked a generic `network` service that is not portable across common systemd Linux distributions. Removed it from the loop and made the task explicitly start/check `sshd` and `myapp`.
- Delegated port and HTTP checks used `ansible_host` directly, which can be undefined. Updated them to `ansible_host | default(inventory_hostname)`, matching Ansible's documented pattern for delegated `wait_for` checks.
- The handler example said `vm.swappiness` required a reboot. That sysctl can be applied at runtime, so the comment was corrected.
- The handler example used `ansible.builtin.sysctl`, but current documentation places the sysctl module in `ansible.posix`. Updated the task to `ansible.posix.sysctl`.
- The handler example used `ansible.builtin.yum`. In current Ansible, `yum` is a redirect to `dnf`, and the old YUM backend was removed in ansible-core 2.17. Updated the example to `ansible.builtin.dnf`.
- The GRUB update handler used RHEL-specific `grub2-mkconfig -o /boot/grub2/grub.cfg` in an all-host play. Added Red Hat family guards to the GRUB task and handler.

## Review Notes
The corrected post is technically valid for current Ansible documentation. I could not run `ansible-playbook --syntax-check` locally because Ansible tooling is not installed in this workspace, so validation was performed by source review against official documentation.
