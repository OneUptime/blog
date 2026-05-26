# Validation Summary: How to Use the Ansible dense Callback Plugin for Compact Output

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible callback plugins
- `community.general.dense` stdout callback
- `ansible.builtin` modules: `apt`, `template`, `service`, `stat`, `reboot`, `command`
- `ansible.posix.timer` and `ansible.posix.profile_tasks` aggregate callbacks
- Ansible configuration via `ansible.cfg` and environment variables

## Sources Consulted
- Ansible Community Documentation: `community.general.dense` callback: https://docs.ansible.com/projects/ansible/latest/collections/community/general/dense_callback.html
- Ansible callback plugin documentation: https://docs.ansible.com/projects/ansible/latest/plugins/callback.html
- Ansible callback plugin index: https://docs.ansible.com/projects/ansible/latest/collections/index_callback.html
- Ansible stdout callback index: https://docs.ansible.com/projects/ansible/latest/collections/callback_index_stdout.html
- Ansible aggregate callback index: https://docs.ansible.com/projects/ansible/latest/collections/callback_index_aggregate.html
- Ansible `ansible.posix.timer` callback documentation: https://docs.ansible.com/ansible/latest/collections/ansible/posix/timer_callback.html
- Ansible `ansible.posix.profile_tasks` callback documentation: https://docs.ansible.com/ansible/latest/collections/ansible/posix/profile_tasks_callback.html
- Ansible `ansible.builtin.apt` module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/apt_module.html
- Ansible `ansible.builtin.command` module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/command_module.html
- Ansible `ansible.builtin.reboot` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/reboot_module.html
- `community.general.dense` callback source: https://github.com/ansible-collections/community.general/blob/main/plugins/callback/dense.py

## Issues Found
- The post described `dense` as one-line-per-task aggregate output with `ok`, `changed`, `unreachable`, `failed`, and `skipped` counts. Current `community.general.dense` does not work that way; it is a stdout callback that updates compact host-status progress and keeps changed, failed, and unreachable results visible. Updated the description, examples, failure handling, practical example, and summary.
- The post implied `dense` was available as a core callback. Current documentation places it in the `community.general` collection, which is not included in `ansible-core`. Updated examples to use `community.general.dense` and added the needed `ansible-galaxy collection install community.general` command.
- The `timer` and `profile_tasks` examples used unqualified callback names. Current documentation places them in the `ansible.posix` collection. Updated `callbacks_enabled` to `ansible.posix.timer, ansible.posix.profile_tasks`.
- The post referred to `yaml`, `json`, and `debug` callbacks in ways that do not match the current callback index. Updated development/debugging guidance and aliases to use current documented callbacks, including `ansible.posix.debug` and `ansible.posix.json`, and referred to the default callback with YAML-formatted results instead of a standalone current `yaml` callback.
- The timing sample used `Wednesday 21 February 2026`, but February 21, 2026 is a Saturday. Corrected the sample day.
- The `minimal` callback sample was too terse for documented minimal callback behavior. Updated it to show host-oriented status plus result payload.

## Review Notes
The playbook snippets use documented `ansible.builtin` modules and valid parameters. `ansible` was not installed in the local environment, so validation used official documentation and the upstream `community.general.dense` source rather than running `ansible-playbook`.
