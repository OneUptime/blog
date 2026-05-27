# Validation Summary: How to Use the Ansible profile_roles Callback Plugin

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible callback plugins
- `ansible.posix.profile_roles`
- `ansible.posix.profile_tasks`
- `ansible.posix.timer`
- Ansible playbooks and roles
- Shell scripting for Ansible output parsing

## Sources Consulted
- Ansible documentation: `ansible.posix.profile_roles` callback: https://docs.ansible.com/projects/ansible/latest/collections/ansible/posix/profile_roles_callback.html
- Ansible Core documentation: callback plugin behavior and `callbacks_enabled`: https://docs.ansible.com/projects/ansible-core/devel/plugins/callback.html
- Ansible documentation: `ansible.posix.profile_tasks` callback: https://docs.ansible.com/projects/ansible/latest/collections/ansible/posix/profile_tasks_callback.html
- Ansible documentation: `ansible.posix.timer` callback: https://docs.ansible.com/ansible/latest/collections/ansible/posix/timer_callback.html
- `ansible.posix` collection source for `profile_roles`, `profile_tasks`, and `timer`: https://github.com/ansible-collections/ansible.posix/tree/main/plugins/callback

## Issues Found
- The post used the older `callback_whitelist` and `ANSIBLE_CALLBACK_WHITELIST` names. Updated examples to the current `callbacks_enabled` and `ANSIBLE_CALLBACKS_ENABLED` settings.
- The callback examples used short plugin names (`profile_roles`, `profile_tasks`, `timer`). Updated them to the documented fully qualified collection names: `ansible.posix.profile_roles`, `ansible.posix.profile_tasks`, and `ansible.posix.timer`.
- The post did not mention that `profile_roles` is provided by the `ansible.posix` collection and is not included with `ansible-core`. Added the official installation caveat and `ansible-galaxy collection install ansible.posix` command.
- The sample `profile_roles` output omitted the current `ROLES RECAP` banner and `total` row. Updated the examples and surrounding explanation to match the current plugin source.
- One example claimed `--tags database` profiles a role in isolation. Tags only select tagged tasks, so the wording was changed to "Profile tagged database tasks"; the separate one-role test playbook remains the isolation example.
- The shell parsing examples matched only the separator and would include the `total` line in CSV output. Updated the display and CSV parsing commands to target the `ROLES RECAP` section and role timing rows more accurately.
- The sample timestamp said "Thursday 21 February 2026", but that date is a Saturday. Corrected the sample day name.
- The role-level timing explanation referenced a `database` role in a sample playbook that did not contain one. Updated the sentence to refer to the `webserver` role from the sample playbook.

## Review Notes
- The callback still exposes `CALLBACK_NEEDS_WHITELIST` internally in the collection source, but current user-facing documentation uses `callbacks_enabled`.
- `ansible-doc` was not installed in the local workspace, so verification used current official Ansible documentation and the official `ansible.posix` collection source.
