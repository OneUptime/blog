# Validation Summary: How to Use Ansible Block/Rescue/Always for Error Handling

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ansible playbooks
- Ansible block/rescue/always error handling
- Ansible built-in modules: copy, command, find, systemd, debug, fail, lineinfile, template, uri, unarchive
- community.docker collection modules
- PostgreSQL command-line tools

## Sources Consulted
- Ansible Blocks documentation: https://docs.ansible.com/projects/ansible-core/devel/playbook_guide/playbooks_blocks.html
- Ansible Special Variables documentation: https://docs.ansible.com/projects/ansible/latest/reference_appendices/special_variables.html
- ansible.builtin.copy module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/copy_module.html
- ansible.builtin.command module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/command_module.html
- ansible.builtin.find module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/find_module.html
- ansible.builtin.systemd_service module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/systemd_service_module.html

## Issues Found
- The deployment rollback example assumed `backup: true` creates `/opt/app/app.jar.bak`. Ansible's copy module creates a timestamped backup and returns its path in `backup_file`, so the example now registers the copy result and restores from `deploy_copy.backup_file`.
- The same rollback task used `when: ansible_check_mode is not defined`. `ansible_check_mode` is a magic boolean variable, so the condition was changed to `not ansible_check_mode`.
- The database migration example used `ansible.builtin.command` with a wildcard in `ls -t /var/backups/pre_migration_*.dump`. The command module does not process shell globbing, so the example now uses `ansible.builtin.find` and sorts the returned files by `mtime`.

## Review Notes
The core explanation of `block`, `rescue`, `always`, rescued failures, block-level directives, and `ansible_failed_task`/`ansible_failed_result` matches the official Ansible documentation. The examples are illustrative and still assume application-specific files, services, inventory groups, and variables exist.
