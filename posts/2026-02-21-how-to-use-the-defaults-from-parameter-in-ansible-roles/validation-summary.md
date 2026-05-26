# Validation Summary: How to Use the defaults_from Parameter in Ansible Roles

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ansible roles
- ansible.builtin.include_role
- ansible.builtin.import_role
- Ansible variable precedence
- Ansible role defaults and vars
- ansible-playbook CLI
- YAML
- Jinja2 templates

## Sources Consulted
- Ansible Community Documentation: ansible.builtin.include_role module, https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/include_role_module.html
- Ansible Community Documentation: ansible.builtin.import_role module, https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/import_role_module.html
- Ansible Community Documentation: Roles, https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbooks_reuse_roles.html
- Ansible Community Documentation: Using variables, https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbooks_variables.html
- Ansible Community Documentation: ansible-playbook CLI, https://docs.ansible.com/projects/ansible/latest/cli/ansible-playbook.html
- Ansible Community Documentation: ansible.builtin.user module, https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/user_module.html
- Ansible Community Documentation: ansible.builtin.group module, https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/group_module.html

## Issues Found
- The example role created an application user with `group: "{{ app_group }}"` but did not ensure that the primary group exists first. The Ansible `user` module sets a user's primary group by group name, and the `group` module is the documented way to manage group presence. I added a `Create application group` task before the user task so the example role can run reliably.

## Review Notes
- Current Ansible documentation confirms that `defaults_from`, `vars_from`, `tasks_from`, and `handlers_from` are valid parameters for `ansible.builtin.include_role`; `defaults_from`, `vars_from`, `tasks_from`, and `handlers_from` are also valid for `ansible.builtin.import_role`.
- Current Ansible documentation confirms role defaults have very low precedence and role vars have high precedence relative to inventory and play variables.
- Current Ansible documentation confirms `ansible-playbook -e` sets extra vars and `-l` limits the selected hosts.
