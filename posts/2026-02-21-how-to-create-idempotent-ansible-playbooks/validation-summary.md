# Validation Summary: How to Create Idempotent Ansible Playbooks

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible playbooks
- Ansible built-in modules: command, shell, file, lineinfile, template, copy, user, apt, service, systemd
- Ansible handlers
- ansible-playbook check and diff modes
- YAML playbook syntax
- Linux service and package management concepts

## Sources Consulted
- Ansible command module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/command_module.html
- Ansible shell module documentation: https://docs.ansible.com/projects/ansible-core/2.20/collections/ansible/builtin/shell_module.html
- Ansible lineinfile module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/lineinfile_module.html
- Ansible file module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/file_module.html
- Ansible apt module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/apt_module.html
- Ansible service module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/service_module.html
- Ansible systemd_service module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/systemd_service_module.html
- Ansible handlers documentation: https://docs.ansible.com/ansible/latest/playbook_guide/playbooks_handlers.html
- Ansible check mode and diff mode documentation: https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbooks_checkmode.html
- ansible-playbook CLI documentation: https://docs.ansible.com/ansible/latest/cli/ansible-playbook.html

## Issues Found
- The post originally said Ansible checks the current state for every task. This was too broad because arbitrary command and shell tasks are not state-aware unless guarded with options such as creates or removes. Changed the wording to refer to tasks using state-aware modules.
- The lineinfile section originally implied a task without regexp would add a duplicate line on every run and that regexp ensures only one matching line exists. The official lineinfile behavior is that regexp replaces the last matching line, while an exact-line task can add a second setting if an existing line differs. Updated the explanation and comments to match that behavior.
- The automated testing snippet said to run the playbook and check for zero changes, but idempotency should be checked on the second run. Updated the comment to make that requirement explicit.

## Review Notes
- The examples use short module names such as file, service, and template. Ansible documentation recommends fully qualified collection names for linking and avoiding collection-name conflicts, but short names for ansible.builtin modules remain valid.
- The service module documents started and stopped as idempotent, while restarted and reloaded always perform an action. The post uses restarted and reloaded only in handlers, which is technically appropriate because handlers run only when notified by changed tasks.
- ansible-playbook was not installed in the local workspace, so examples were validated against official documentation rather than executed locally.
