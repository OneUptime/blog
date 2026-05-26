# Validation Summary: How to Speed Up Ansible Playbook Execution

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible playbooks
- Ansible configuration
- SSH connection plugins and ControlPersist
- Ansible fact gathering and fact caching
- Ansible strategy plugins
- Ansible asynchronous tasks
- Ansible callback plugins

## Sources Consulted
- Ansible configuration settings: https://docs.ansible.com/projects/ansible/latest/reference_appendices/config.html
- Ansible playbook keywords: https://docs.ansible.com/projects/ansible/latest/reference_appendices/playbooks_keywords.html
- Ansible SSH connection plugin: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/ssh_connection.html
- Ansible setup module and gather_subset examples: https://docs.ansible.com/projects/ansible-core/2.16/collections/ansible/builtin/setup_module.html
- Ansible async_status module: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/async_status_module.html
- Ansible profile_tasks callback: https://docs.ansible.com/projects/ansible/latest/collections/ansible/posix/profile_tasks_callback.html
- Ansible raw module: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/raw_module.html
- Ansible command module: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/command_module.html
- Ansible lineinfile module: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/lineinfile_module.html
- Ansible CLI reference: https://docs.ansible.com/projects/ansible/latest/cli/ansible.html

## Issues Found
- The explanation said each task opens an SSH connection. Current Ansible SSH defaults use ControlMaster and ControlPersist, so I changed the wording to describe module execution and connection setup overhead without implying every task always opens a fresh connection.
- The sudoers check only searched `/etc/sudoers`. I changed it to search both `/etc/sudoers` and `/etc/sudoers.d`, suppress missing-path noise, and avoid failing the ad hoc command when no match is present. I also clarified that the following removal task applies to entries in `/etc/sudoers`.
- The `lineinfile` sudoers example edited `/etc/sudoers` without validation. I added `validate: 'visudo -cf %s'`, matching the official `lineinfile` guidance for sudoers edits.
- The module compression example used `module_compression = ZIP`, but Ansible documents `ZIP_DEFLATED` as the default compression scheme. I changed the example and surrounding text to use the documented value.
- The text said both `raw` and `command` skip module overhead. Official docs show `raw` bypasses the module subsystem and does not require Python; `command` is still a normal Ansible module. I corrected the wording to refer only to `raw`.
- The callback example used `callbacks_enabled = profile_tasks`. Current docs identify this callback as `ansible.posix.profile_tasks`, so I updated both examples and the surrounding text.
- The sample output labeled February 21, 2026 as Wednesday. That date is a Saturday, so I corrected the example output.

## Review Notes
- The remaining examples are technically valid, but many performance percentages are experience-based estimates rather than guarantees from official documentation. They should be treated as illustrative.
- The `ansible.posix.profile_tasks` callback is not included in `ansible-core`; it is included with the broader `ansible` package when the `ansible.posix` collection is present.
