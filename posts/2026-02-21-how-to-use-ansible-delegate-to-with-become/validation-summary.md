# Validation Summary: How to Use Ansible delegate_to with Become

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible playbooks
- Ansible task delegation with `delegate_to`
- Ansible privilege escalation with `become`
- Ansible inventory and connection variables
- Ansible built-in modules: `apt`, `systemd`, `command`, `iptables`, `lineinfile`, `debug`
- Ansible Vault

## Sources Consulted
- Ansible Community Documentation: Controlling where tasks run: delegation and local actions - https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbooks_delegation.html
- Ansible Community Documentation: Understanding privilege escalation: become - https://docs.ansible.com/ansible/latest/playbook_guide/playbooks_privilege_escalation.html
- Ansible Community Documentation: `ansible.builtin.systemd_service` module - https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/systemd_service_module.html
- Ansible Community Documentation: `ansible.builtin.apt` module - https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/apt_module.html
- Ansible Community Documentation: `ansible.builtin.iptables` module - https://docs.ansible.com/projects/ansible-core/2.17/collections/ansible/builtin/iptables_module.html
- Ansible Community Documentation: `ansible.builtin.lineinfile` module - https://docs.ansible.com/ansible/latest/collections/ansible/builtin/lineinfile_module.html

## Issues Found
- Corrected the delegation variable-resolution explanation. The original text said a non-inventory delegated host falls back to the current play's connection settings. Ansible documentation says delegated hosts do not inherit variables from the host delegating the task, and non-inventory delegated hosts are not added to inventory; they may inherit broad variables such as `all` group variables. The post now recommends defining delegated hosts in inventory or adding them with `add_host`.
- Clarified that task-level become directives apply to delegated tasks, but host-specific become connection variables can override those directives.
- Removed a play-level `ansible_user` variable from the connection-user example because play variables can override inventory variables, which conflicted with the example's explanation that the delegated host's inventory connection user is used.
- Changed the local "no become needed" log example from `/var/log/deployments.log` to `/tmp/deployments.log`, because `/var/log` normally requires elevated privileges and contradicted `become: false`.
- Replaced the read-only service-status example that used `ansible.builtin.systemd` with only `name`. Current `systemd_service` documentation requires at least `state` or `enabled`, so the example now uses `ansible.builtin.command: systemctl is-active nginx` with `changed_when: false` and `failed_when: false`.
- Updated the flow diagram to reflect delegated-host inventory variables, non-inventory delegated-host behavior, and host-specific become variable precedence.

## Review Notes
The post is technically relevant and useful after the corrections. Future improvements could mention Ansible's delegation concurrency warning when multiple target hosts delegate writes to the same host; this is adjacent to the topic but not required for correctness here.
