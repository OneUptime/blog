# Validation Summary: How to Set Playbook Timeout for Long-Running Tasks

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible playbooks
- Ansible configuration (`ansible.cfg`)
- Ansible task timeout keyword
- Ansible asynchronous tasks (`async` and `poll`)
- Ansible persistent connections
- Ansible `apt`, `reboot`, `wait_for`, `command`, and `shell` modules
- SSH connection timeouts

## Sources Consulted
- Ansible configuration settings: https://docs.ansible.com/projects/ansible/latest/reference_appendices/config.html
- Ansible playbook keywords: https://docs.ansible.com/projects/ansible/latest/reference_appendices/playbooks_keywords.html
- Ansible asynchronous actions and polling: https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbooks_async.html
- Ansible `ansible-playbook` CLI: https://docs.ansible.com/projects/ansible/latest/cli/ansible-playbook.html
- Ansible `command` module: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/command_module.html
- Ansible `shell` module: https://docs.ansible.com/projects/ansible-core/2.18/collections/ansible/builtin/shell_module.html
- Ansible `apt` module: https://docs.ansible.com/projects/ansible/6/collections/ansible/builtin/apt_module.html
- Ansible `reboot` module: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/reboot_module.html
- Ansible `wait_for` module: https://docs.ansible.com/projects/ansible-core/2.20/collections/ansible/builtin/wait_for_module.html

## Issues Found
- The `ansible.cfg` examples used inline `#` comments after values. Ansible documents that inline comments after regular INI values must use semicolons, so the examples were changed to use `;`.
- The default timeout section incorrectly described `[defaults] timeout` / `DEFAULT_TIMEOUT` as the default for command and shell module execution. It is the default timeout for connection plugins. The section was corrected to use `task_timeout` for task action timeout and persistent connection settings for persistent command timeouts.
- The async build example used `command: make -j$(nproc) all`, but the `command` module does not process shell substitutions. It was changed to `shell: make -j"$(nproc)" all`.
- The package update task was labeled as applying security updates, but `apt upgrade: safe` performs available package upgrades rather than filtering to security updates. The task name was corrected.
- The `systemctl is-system-running` retry example described `timeout` as a total stabilization period. Ansible task timeout applies per task action attempt, so the example was adjusted to use retries and delay for the total wait and a shorter per-attempt timeout.
- The environment variable section omitted the task action timeout environment variable. `ANSIBLE_TASK_TIMEOUT` was added.

## Review Notes
The post is technically relevant and current after the fixes. The examples still use short module names, which are valid, though Ansible documentation recommends fully qualified collection names when linking or avoiding collection name conflicts.
