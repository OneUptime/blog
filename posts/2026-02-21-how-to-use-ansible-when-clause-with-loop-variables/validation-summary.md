# Validation Summary: How to Use Ansible when Clause with Loop Variables

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ansible playbooks
- Ansible `when` conditionals
- Ansible `loop` and `loop_control`
- Ansible registered loop results
- Ansible built-in modules: `apt`, `user`, `template`, `command`, `systemd`, `iptables`, `set_fact`, `debug`, and `package`
- YAML playbook syntax

## Sources Consulted
- Ansible conditionals documentation: https://docs.ansible.com/projects/ansible-core/devel/playbook_guide/playbooks_conditionals.html
- Ansible loops documentation: https://docs.ansible.com/projects/ansible-core/devel/playbook_guide/playbooks_loops.html
- `ansible.builtin.package` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/package_module.html
- `ansible.builtin.iptables` module documentation: https://docs.ansible.com/projects/ansible-core/2.17/collections/ansible/builtin/iptables_module.html
- `ansible.builtin.systemd_service` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/systemd_service_module.html

## Issues Found
- The user account example used `state: "{{ 'present' if account.active else 'absent' }}"` while also using `when: account.active`. The `absent` branch could never run because inactive accounts are skipped. Changed the state to `present` to match the example's stated goal of creating only active accounts.
- The nested data example comment said application deployment depended on a health check endpoint responding, but the task only checks whether `inventory_hostname` is in `item.deploy_to`. Updated the comment to describe the actual condition.
- The package installation example included a Windows package while using `ansible.builtin.package`. Official Ansible documentation says Windows targets should use `ansible.windows.win_package` instead. Updated the scenario to a heterogeneous Linux fleet and removed the Windows package entry.

## Review Notes
The main explanations of `when` with loops, default `item` loop variables, `loop_control.loop_var`, registered loop result structures, YAML-list `when` conditions as implicit AND, and `loop_control.index_var` are consistent with official Ansible documentation. The `ansible.builtin.systemd` name remains available as a backward-compatible alias, though the current canonical module name is `ansible.builtin.systemd_service`.
