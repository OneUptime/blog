# Validation Summary: How to Use the tasks_from Parameter in Ansible Roles

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible roles
- ansible.builtin.include_role
- ansible.builtin.import_role
- ansible.builtin.include_tasks
- community.postgresql.postgresql_db
- ansible.builtin.find
- PostgreSQL backup commands

## Sources Consulted
- Ansible include_role module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/include_role_module.html
- Ansible import_role module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/import_role_module.html
- Ansible roles guide: https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbooks_reuse_roles.html
- community.postgresql.postgresql_db module documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/postgresql/postgresql_db_module.html
- Ansible find module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/find_module.html

## Issues Found
- The post incorrectly claimed that `tasks_from` can be used directly under the play-level `roles:` directive. The official role reuse documentation describes custom role entry points for `include_role` and `import_role`, while the play-level `roles:` syntax loads `main.yml`, `main.yaml`, or `main`. I changed that section to use `ansible.builtin.import_role` for static role imports with `tasks_from`.
- The `community.postgresql.postgresql_db` example set `lc_collate` and `lc_ctype` without specifying `template: template0`. The official module example uses `template0` when creating a database with explicit encoding and locale settings, because locale settings must match the template unless a suitable template is selected. I added `template: template0` to the example.

## Review Notes
- `include_role` and `import_role` both support `tasks_from`, and the examples using those modules are technically correct.
- The file-extension note is consistent with Ansible's documented role entry point behavior and examples that use `tasks_from: other` to load `tasks/other.yaml`.
- The backup example is illustrative and technically plausible, but production playbooks may need additional quoting or validation if database names or backup paths contain shell-sensitive characters.
