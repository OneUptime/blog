# Validation Summary: Why Your Ansible Handler Did Not Run—and How Handler Timing Really Works

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Ansible playbooks
- Ansible handlers and notifications
- `ansible.builtin.template`
- `ansible.builtin.service`
- `ansible.builtin.command`
- `ansible.builtin.uri`
- `ansible.builtin.meta` and `flush_handlers`
- Ansible roles, task imports, and task includes

## Sources Consulted
- Ansible handlers guide: https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbooks_handlers.html
- Ansible error-handling guide: https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbooks_error_handling.html
- Ansible blocks guide: https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbooks_blocks.html
- `ansible.builtin.meta` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/meta_module.html
- `ansible-playbook` CLI documentation: https://docs.ansible.com/projects/ansible/latest/cli/ansible-playbook.html
- `ansible.builtin.template` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/template_module.html
- `ansible.builtin.service` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/service_module.html
- `ansible.builtin.command` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/command_module.html
- `ansible.builtin.uri` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/uri_module.html

## Issues Found
- Two YAML examples combined a top-level task sequence with a sibling `handlers:` mapping, which was not a valid YAML document. Added the `tasks:` play keyword and corrected indentation so both examples are valid play-level excerpts.
- The includes/imports section incorrectly implied that handlers defined inside a dynamic task include become available after the include executes, and it reversed the behavior of notifying a dynamic include as a handler. Updated the section to distinguish role insertion from task-file inclusion: handlers from `include_role` become available after that task executes; a static `import_tasks` in the handlers section exposes its imported tasks for individual notification; a notified dynamic `include_tasks` runs every included task; and handlers defined inside a dynamic include cannot be notified.

## Review Notes
The remaining handler timing, deduplication, loop notification, naming and shadowing, forced-handler, rescue, and `flush_handlers` claims match the current official Ansible documentation. The CLI options and module parameters shown are current, and no deprecated interfaces were found.
