# Validation Summary: How to Handle Ansible Tags for Selective Execution

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible playbooks
- Ansible tags
- Ansible roles
- Ansible task includes and imports
- Ansible CLI options for selective execution
- YAML playbook syntax

## Sources Consulted
- Ansible Community Documentation: Tags: https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbooks_tags.html
- Ansible Community Documentation: ansible.builtin.include_tasks module: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/include_tasks_module.html
- Ansible Community Documentation: ansible.builtin.include_role module: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/include_role_module.html
- Ansible Community Documentation: ansible.builtin.import_tasks module: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/import_tasks_module.html
- Ansible Community Documentation: ansible.builtin.import_role module: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/import_role_module.html
- Ansible Community Documentation: ansible.builtin.file module: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/file_module.html

## Issues Found
- The `always` tag explanation said tasks run regardless of which tags are specified. Ansible documents that `always` tasks can still be skipped explicitly with `--skip-tags always`, so the wording and inline comments were updated to include that exception.
- The tag inheritance section said tags flow down from plays to roles to blocks to tasks. This was too broad because dynamic `include_tasks` and `include_role` do not inherit tags by default. The wording was narrowed to plays, blocks, roles declared with the `roles` keyword, and static imports.
- The environment-based examples used `include_tasks` while the commands implied the tag would apply to all tasks in each included file. Dynamic includes do not apply the tag to nested tasks by default, so these examples were changed to `import_tasks`.
- The component-based examples used `include_role` while the commands implied the tag would apply to all tasks in each role. Dynamic role includes do not apply tags to role tasks by default, so these examples were changed to `import_role`.
- The dangerous cleanup example used `recurse: yes` with `state: absent`. The file module recursively deletes directories with `state: absent`; `recurse` applies to `state: directory`, so the unnecessary and misleading option was removed.

## Review Notes
The Ansible CLI options shown for `--tags`, `-t`, `--skip-tags`, `--list-tags`, and `--list-tasks` match the official tag documentation. The local environment did not have `ansible-playbook` installed, so command verification was performed against official Ansible documentation rather than local CLI help.
