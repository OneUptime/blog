# Validation Summary: How to Include Roles Dynamically with include_role

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible
- Ansible roles
- ansible.builtin.include_role
- ansible.builtin.import_role
- Ansible playbook YAML

## Sources Consulted
- Ansible `ansible.builtin.include_role` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/include_role_module.html
- Ansible `ansible.builtin.import_role` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/import_role_module.html
- Ansible roles guide: https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbooks_reuse_roles.html
- Ansible tags guide: https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbooks_tags.html

## Issues Found
- Corrected the variable-scope section. The post said variables from an included role are available to later tasks by default, but `include_role` defaults to `public: false`; role `defaults/` and `vars/` are exposed to later tasks only when `public: true`.
- Tightened the conditional-skip explanation. The original wording said no tasks, handlers, or variables are loaded when the condition is false. The corrected text focuses on the behavior guaranteed by the task condition: the role is skipped and its tasks do not run.
- Updated the execution-flow diagram to say role defaults and vars are loaded rather than executed. Defaults and vars are variable data, not executable task steps.

## Review Notes
Ansible was not installed in the local environment, so validation was performed against the current official Ansible documentation rather than by running playbooks locally. The examples use the recommended fully qualified collection name `ansible.builtin.include_role`, and the documented options `tasks_from`, `defaults_from`, `vars_from`, `public`, and `apply` match official module documentation.
