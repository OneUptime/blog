# Validation Summary: How to Use Ansible flush_handlers to Run Handlers Immediately

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible playbooks
- Ansible handlers and notifications
- `ansible.builtin.meta` / `flush_handlers`
- Ansible task execution with `serial` and `run_once`
- Ansible `command`, `shell`, `template`, `apt`, `uri`, `copy`, `unarchive`, and `systemd` modules
- systemd-managed services

## Sources Consulted
- Ansible Community Documentation: Handlers - running operations on change: https://docs.ansible.com/ansible/latest/playbook_guide/playbooks_handlers.html
- Ansible Core Documentation: `ansible.builtin.meta` module: https://docs.ansible.com/projects/ansible-core/2.16/collections/ansible/builtin/meta_module.html
- Ansible Community Documentation: Controlling playbook execution - strategies and more: https://docs.ansible.com/projects/ansible-core/devel/playbook_guide/playbooks_strategies.html
- Ansible Community Documentation: `ansible.builtin.command` module: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/command_module.html
- Ansible Core Documentation: `ansible.builtin.shell` module: https://docs.ansible.com/projects/ansible-core/2.18/collections/ansible/builtin/shell_module.html
- Ansible Community Documentation: `ansible.builtin.systemd_service` module: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/systemd_service_module.html

## Issues Found
- The opening description said handlers run at the very end of a play. Ansible documents handler execution at normal handler flush points, including after `pre_tasks`, the roles/tasks section, and `post_tasks`. Updated the wording to avoid implying handlers only run at the literal end of every play.
- The problem explanation said the queued handler would not run until after all tasks complete. Updated this to say it runs at the next normal handler flush point.
- The database migration example used `run_once: true` in a play with `serial: 3`. Ansible documents that `run_once` with `serial` runs once per serial batch, so this could run migrations multiple times. Replaced it with `when: inventory_hostname == ansible_play_hosts_all[0]` so it runs only once across the whole play.
- The certificate verification example used the `command` module with shell redirection and a pipe. Ansible documents that `command` does not process shell metacharacters such as `<`, `>`, or `|`. Changed the task to use `shell`.

## Review Notes
The `systemd` module examples remain technically valid because `ansible.builtin.systemd` is kept as a backward-compatible alias for `ansible.builtin.systemd_service`. The examples use short module names, which are still supported, though Ansible documentation recommends fully qualified collection names for clarity.
