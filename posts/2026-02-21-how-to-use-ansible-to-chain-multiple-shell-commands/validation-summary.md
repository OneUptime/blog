# Validation Summary: How to Use Ansible to Chain Multiple Shell Commands

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible playbooks
- ansible.builtin.shell
- ansible.builtin.command
- ansible.builtin.git
- ansible.builtin.uri
- Ansible conditionals, loops, register, and block/rescue/always
- Bash shell command chaining and error handling

## Sources Consulted
- Ansible shell module documentation: https://docs.ansible.com/projects/ansible-core/2.18/collections/ansible/builtin/shell_module.html
- Ansible command module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/command_module.html
- Ansible git module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/git_module.html
- Ansible uri module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/uri_module.html
- Ansible conditionals documentation: https://docs.ansible.com/ansible/latest/playbook_guide/playbooks_conditionals.html
- Ansible blocks documentation: https://docs.ansible.com/projects/ansible-core/devel/playbook_guide/playbooks_blocks.html
- Ansible loops documentation: https://docs.ansible.com/projects/ansible-core/devel/playbook_guide/playbooks_loops.html
- GNU Bash Reference Manual: https://www.gnu.org/s/bash/manual/bash.html

## Issues Found
- The task-level chaining example used `when: stop_result is defined or git_result.changed` to decide whether to start the application. Ansible registers variables even for skipped tasks, so `stop_result is defined` can be true even when the stop task did not run. Changed the condition to `when: app_check.rc == 0 or git_result.changed` so it follows the actual application state and git result.
- The `block` deployment example ran `cd`, `npm ci`, and `npm run build` in a multi-line shell task without `set -e` or `&&`. That could allow an earlier command failure to be hidden by a later successful command. Added `set -e` so the task fails on the first unhandled command failure.

## Review Notes
- The remaining examples are syntactically consistent with current Ansible module parameters and Bash command chaining behavior.
- The shell examples use templated variables in shell commands. In production playbooks, applying Ansible's `quote` filter to shell-interpolated variables is safer when values may come from inventory, extra vars, or user input.
