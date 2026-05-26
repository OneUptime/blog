# Validation Summary: How to Use Ansible become with Specific sudoers Configuration

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible privilege escalation with `become`
- Ansible sudo become plugin
- Ansible `copy`, `template`, `command`, `assert`, `file`, `dnf`, and `git` modules
- sudo and sudoers configuration
- visudo validation
- Ansible Vault variables
- Linux privilege escalation and logging

## Sources Consulted
- Ansible documentation: Understanding privilege escalation: become - https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbooks_privilege_escalation.html
- Ansible documentation: ansible.builtin.sudo become plugin - https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/sudo_become.html
- Ansible documentation: ansible.builtin.copy module - https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/copy_module.html
- Sudo manual - https://www.sudo.ws/docs/man/sudo.man/
- Sudoers manual - https://www.sudo.ws/docs/man/sudoers.man/
- Visudo manual - https://www.sudo.ws/docs/man/1.8.9/visudo.man/
- Local sudo/visudo installation: sudo 1.9.15p5 and visudo 1.9.15p5

## Issues Found
- The post described a command-restricted sudoers configuration as still allowing Ansible to function normally. Ansible's official documentation states that privilege escalation cannot reliably be limited to specific command paths because modules run from temporary files through wrappers. I changed this section to explain that command aliases apply to explicit sudo commands, not most normal Ansible module execution.
- The restricted sudoers examples included Python command aliases in a way that implied allowing `/usr/bin/python3` was enough for Ansible modules. I removed those aliases from the restricted examples and added wording that normal modules generally need broader wrapper access.
- The `become_user: dbbackup` example allowed only `/usr/bin/pg_dump` and `/usr/bin/pg_restore` in sudoers while using `ansible.builtin.command`, which would still execute through Ansible's module wrapper. I changed that sudoers rule to `NOPASSWD: ALL` for the `dbbackup` run-as target so the shown Ansible task works as written.
- The opening sudo example was described as the exact command Ansible sends. I changed that wording to say it is a representative command, because exact module paths, prompt flags, temporary paths, and wrapper details vary by Ansible configuration and task.

## Review Notes
- The `validate: 'visudo -cf %s'` pattern is technically valid, and Ansible's official copy module documentation shows the same approach with `visudo`.
- `timestamp_timeout=0` has little practical impact when paired with `NOPASSWD: ALL`, but the sudoers syntax is valid.
- `log_input` and `log_output` are valid sudoers options, but they can create sensitive I/O logs and should be deployed with log retention and access controls appropriate to the environment.
- `ansible-playbook` was not installed locally, so playbook execution could not be tested in this workspace. Syntax and behavior were reviewed against official documentation and local sudo/visudo availability.
