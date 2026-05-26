# Validation Summary: How to Run a Task Based on the Previous Task Result in Ansible

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible playbooks
- Ansible registered variables
- Ansible `when` conditionals and Jinja tests
- Ansible error handling with `failed_when`, `changed_when`, `block`, and `rescue`
- Ansible built-in modules: `command`, `systemd`, `uri`, `template`, `copy`, `unarchive`, `file`, `debug`, `fail`, and `set_fact`

## Sources Consulted
- Ansible conditionals documentation: https://docs.ansible.com/ansible/latest/playbook_guide/playbooks_conditionals.html
- Ansible error handling documentation: https://docs.ansible.com/ansible/latest/playbook_guide/playbooks_error_handling.html
- Ansible blocks and rescue documentation: https://docs.ansible.com/ansible/latest/playbook_guide/playbooks_blocks.html
- Ansible variables documentation: https://docs.ansible.com/ansible/latest/playbook_guide/playbooks_variables.html
- Ansible special variables documentation: https://docs.ansible.com/projects/ansible/latest/reference_appendices/special_variables.html
- `ansible.builtin.command` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/command_module.html
- `ansible.builtin.systemd` / `systemd_service` module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/systemd_module.html
- `ansible.builtin.uri` module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/uri_module.html
- `ansible.builtin.unarchive` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/unarchive_module.html
- `ansible.builtin.copy` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/copy_module.html
- `ansible.builtin.file` module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/file_module.html
- `ansible.builtin.template` module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/template_module.html

## Issues Found
- The configuration validation example branched on `validation.rc`, but the validation command would fail the play on a non-zero return code before the rollback task could run. Added `failed_when: false` to let the registered result drive the rollback or restart condition.
- The rollback and restart tasks checked fields on the validation result without confirming the validation task actually ran. Added `validation is not skipped` guards before checking `validation.rc`, matching Ansible's documented behavior for skipped registered variables.
- The deployment pipeline used `is changed` where the prose described successful completion of the prior task. Replaced those gates with `is succeeded` so unchanged-but-successful tasks do not incorrectly block later steps.
- The rescue example reported "Last successful step" by checking whether registered variables were defined, but Ansible registers failed task results too. Replaced this with the documented `ansible_failed_task.name` value and changed the message to report the failed step.
- The best-practice sentence said to always use `failed_when: false` on check tasks that might return non-zero. Narrowed this to checks where non-zero exit codes are expected and should not stop the play, so real failures are not accidentally masked.

## Review Notes
The examples are Linux/systemd-oriented and assume GNU-style commands such as `df -BG --output=avail`. `ansible.builtin.systemd` remains valid, but current documentation redirects it to `ansible.builtin.systemd_service`; using either name is acceptable.
