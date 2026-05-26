# Validation Summary: How to Use Ansible ignore_unreachable for Unreachable Hosts

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible playbooks
- Ansible error handling
- Ansible `ignore_unreachable` and `ignore_errors`
- Ansible task, block, and play keywords
- Ansible `command`, `shell`, `reboot`, `wait_for_connection`, `setup`, `ping`, `debug`, `set_fact`, and `fail` modules
- Ansible configuration

## Sources Consulted
- Ansible error handling in playbooks: https://docs.ansible.com/ansible/latest/playbook_guide/playbooks_error_handling.html
- Ansible playbook keywords reference: https://docs.ansible.com/ansible/latest/reference_appendices/playbooks_keywords.html
- Ansible configuration settings reference: https://docs.ansible.com/ansible/latest/reference_appendices/config.html
- Ansible `ansible.builtin.unreachable` test documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/unreachable_test.html
- Ansible `ansible.builtin.command` module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/command_module.html
- Ansible `ansible.builtin.shell` module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/shell_module.html
- Ansible `ansible.builtin.reboot` module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/reboot_module.html
- Ansible `ansible.builtin.wait_for_connection` module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/wait_for_connection_module.html

## Issues Found
- The opening paragraph said unreachable hosts are marked as failed and removed from subsequent plays. Ansible tracks unreachable hosts separately from normal failed task results, so this was changed to say they are marked unreachable and removed from the active host list.
- The rolling health check example used `ansible.builtin.command` with shell pipelines. The `command` module does not process shell metacharacters such as `|`, so those tasks were changed to `ansible.builtin.shell`.
- The reboot verification example used `systemctl is-system-running` and then expected a later `fail` task to report unhealthy states. Since `command` fails on non-zero return codes by default, `failed_when: false` was added so the status can be evaluated by the following task.
- The post claimed `ignore_unreachable` can be set in `ansible.cfg`. The current official Ansible configuration reference does not list an `ignore_unreachable` config key, so that section was corrected to explain that it should be set as a play, block, or task keyword.

## Review Notes
The core explanation of `ignore_unreachable`, its distinction from `ignore_errors`, task-level usage, play-level usage, block-level usage, and the `is unreachable` conditional test matches the official Ansible documentation. Ansible was not installed in the local environment, so validation was performed against official documentation rather than local `ansible-playbook --syntax-check` output.
