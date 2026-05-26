# Validation Summary: How to Use Ansible ignore_errors Selectively

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ansible playbooks
- Ansible error handling with `ignore_errors`
- Ansible registered variables and conditionals
- Ansible loops and blocks
- Ansible `failed_when` and `changed_when`
- Ansible built-in modules: `command`, `service`, `file`, `apt`, `uri`, `set_fact`, `debug`, `wait_for`, `fail`, `template`, `get_url`, and `unarchive`
- systemd `systemctl`
- PostgreSQL `createuser`

## Sources Consulted
- Ansible Community Documentation: Error handling in playbooks - https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbooks_error_handling.html
- Ansible Community Documentation: Conditionals - https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbooks_conditionals.html
- Ansible Core Documentation: Blocks - https://docs.ansible.com/projects/ansible-core/devel/playbook_guide/playbooks_blocks.html
- Ansible Community Documentation: `ansible.builtin.wait_for` module - https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/wait_for_module.html
- Ansible Community Documentation: `ansible.builtin.uri` module - https://docs.ansible.com/ansible/latest/collections/ansible/builtin/uri_module.html
- Ansible Community Documentation: `ansible.builtin.get_url` module - https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/get_url_module.html
- Ansible Community Documentation: `ansible.builtin.unarchive` module - https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/unarchive_module.html
- Ansible Community Documentation: `ansible.builtin.service` module - https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/service_module.html
- Ansible Lint Documentation: `ignore-errors` rule - https://docs.ansible.com/projects/lint/rules/ignore-errors/
- systemd `systemctl` manual - https://www.freedesktop.org/software/systemd/man/latest/systemctl.html
- PostgreSQL Documentation: `createuser` - https://www.postgresql.org/docs/18/app-createuser.html

## Issues Found
- The section about scoping `ignore_errors` to specific error codes said to combine `ignore_errors` with `failed_when` for finer control. The example correctly used `failed_when` without `ignore_errors`, which is the safer Ansible pattern because expected outcomes can be marked non-failing while unexpected failures still stop the play. Updated the explanation to say to use `failed_when` instead when finer control is needed.
- The best-practices list said to pair `ignore_errors` with `failed_when` for specific failure types. Updated it to recommend `failed_when` instead for that case, matching Ansible's official guidance on defining failure conditions.

## Review Notes
The remaining examples use current Ansible playbook syntax and valid module parameters. `ignore_errors` is accurately described as continuing after task failures that return a failed result; it does not cover unreachable hosts, undefined variables, syntax errors, or execution issues, which could be mentioned in a future expansion but is not required for this post's scope.
