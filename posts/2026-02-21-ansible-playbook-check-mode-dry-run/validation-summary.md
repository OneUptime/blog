# Validation Summary: How to Run an Ansible Playbook in Check Mode (Dry Run)

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible
- Ansible playbooks
- Ansible check mode
- Ansible diff mode
- YAML
- Cron

## Sources Consulted
- Ansible documentation: Validating tasks: check mode and diff mode - https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbooks_checkmode.html
- Ansible documentation: ansible.builtin.command module - https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/command_module.html
- Ansible documentation: ansible.builtin.shell module - https://docs.ansible.com/projects/ansible-core/2.20/collections/ansible/builtin/shell_module.html
- Ansible documentation: ansible.builtin.raw module - https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/raw_module.html
- Ansible documentation: ansible.builtin.assert module - https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/assert_module.html
- Ansible documentation: ansible.builtin.uri module - https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/uri_module.html
- Ansible documentation: ansible.posix.synchronize module - https://docs.ansible.com/ansible/latest/collections/ansible/posix/synchronize_module.html

## Issues Found
- The post said check mode lets users preview exactly what changes a playbook would make. Official documentation describes check mode as a simulation where only modules that support check mode report the changes they would make. Updated the wording to say check mode previews changes for supported modules.
- The explanation said every task that would make a change shows up as changed. Unsupported modules report nothing and do nothing in check mode, so this was narrowed to supported tasks.
- The per-task `check_mode: yes` example used a `shell` command. A plain `shell` task without `creates` or `removes` is skipped in check mode, so the example did not behave as described. Replaced it with an `assert` task, which has full check-mode support.
- The post grouped `shell`, `command`, and `raw` together as modules that do not support check mode. Official module docs say `raw` has no check-mode support, while `shell` and `command` have partial support through `creates` and `removes`. Updated that section and the related explanation.
- The database example comment said the shell task gets skipped in check mode even though the task sets `check_mode: no`. Updated the comment to clarify that a plain shell task would be skipped, so this read-only check is forced to run.

## Review Notes
- `ansible-playbook` was not installed in the local environment, so CLI flags were verified against official Ansible documentation rather than local `--help` output.
- The `uri` example with `check_mode: no` is technically valid, but it intentionally creates an external side effect even in check mode. That is acceptable for the audit-log scenario described, but readers should use it deliberately.
