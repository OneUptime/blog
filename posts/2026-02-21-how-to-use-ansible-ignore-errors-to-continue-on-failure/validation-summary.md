# Validation Summary: How to Use Ansible ignore_errors to Continue on Failure

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ansible playbooks
- Ansible task error handling
- `ignore_errors`
- `ignore_unreachable`
- `block` / `rescue` / `always`
- Ansible package modules (`apt`, `yum`)
- Ansible `setup`, `command`, `debug`, `fail`, `uri`, `template`, `systemd`, and `file` modules

## Sources Consulted
- Ansible Core documentation: Error handling in playbooks - https://docs.ansible.com/projects/ansible-core/devel/playbook_guide/playbooks_error_handling.html
- Ansible Core documentation: Blocks - https://docs.ansible.com/projects/ansible-core/devel/playbook_guide/playbooks_blocks.html
- Ansible documentation: Conditionals and registered variables - https://docs.ansible.com/ansible/latest/playbook_guide/playbooks_conditionals.html
- Ansible Community documentation: `ansible.builtin.apt` module - https://docs.ansible.com/ansible/latest/collections/ansible/builtin/apt_module.html
- Ansible Core documentation: `ansible.builtin.setup` module - https://docs.ansible.com/projects/ansible-core/2.17/collections/ansible/builtin/setup_module.html
- Ansible Core documentation: `ansible.builtin.yum` redirect / package module behavior - https://docs.ansible.com/projects/ansible-core/2.17/collections/ansible/builtin/yum_module.html
- Ansible Lint documentation: `ignore-errors` rule - https://docs.ansible.com/projects/lint/rules/ignore-errors/

## Issues Found
- The block-level `ignore_errors` example used `ansible_failed_result` in a task after the block. Ansible documents `ansible_failed_result` as a special variable available in `rescue` handling, not as a general status variable after an ignored block. I changed the debug message to avoid relying on that variable outside its documented context.
- The "BAD" database backup example used shell redirection with the `command` module. The `command` module does not process shell metacharacters such as `>`, so the example would not behave as a redirected backup command. I changed it to use `pg_dump mydb -f /backups/mydb.sql`, matching `pg_dump`'s file-output option while preserving the point that blindly ignoring backup failures is dangerous.

## Review Notes
The main guidance is technically accurate: `ignore_errors` applies to tasks that run and return a failed result, while unreachable hosts require `ignore_unreachable`; registered results can be tested with `is succeeded` and `is failed`; and `block` / `rescue` / `always` is the more structured pattern for recovery logic. The examples use short Ansible module names, which are valid, though Ansible documentation generally recommends fully qualified collection names for clearer linking and to avoid name collisions.
