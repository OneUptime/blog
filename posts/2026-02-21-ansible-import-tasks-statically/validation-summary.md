# Validation Summary: How to Import Tasks Statically with import_tasks

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ansible
- Ansible playbooks
- `ansible.builtin.import_tasks`
- `ansible.builtin.include_tasks`
- Ansible tags, conditionals, handlers, and CLI task listing

## Sources Consulted
- Ansible Community Documentation: `ansible.builtin.import_tasks` module - https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/import_tasks_module.html
- Ansible Community Documentation: Reusing Ansible artifacts - https://docs.ansible.com/projects/ansible-core/devel/playbook_guide/playbooks_reuse.html
- Ansible Community Documentation: Tags - https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbooks_tags.html
- Ansible Community Documentation: `ansible.builtin.include_tasks` module - https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/include_tasks_module.html

## Issues Found
- The post stated that imported task file paths must be literal strings and cannot use variables. Official Ansible documentation says imported task and role file names support templating, but the variables must be available while Ansible preprocesses imports, such as through `vars` or `--extra-vars`; inventory variables are not available for static imports. Updated the claim and limitation example accordingly.
- The post stated that handlers are not imported with `import_tasks`. Official Ansible documentation allows `import_tasks` in the `handlers:` section and explains that imported static handlers can be notified by the individual imported handler task names. Updated the section to distinguish importing normal task files under `tasks:` from importing handler definitions under `handlers:`.

## Review Notes
The examples use short module names such as `import_tasks`, `apt`, `service`, and `debug`. Ansible documentation recommends fully qualified collection names for easy linking and avoiding name conflicts, but the short names shown remain valid for built-in modules in typical playbooks.
