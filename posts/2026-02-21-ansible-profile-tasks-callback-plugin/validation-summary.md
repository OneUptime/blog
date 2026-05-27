# Validation Summary: How to Use the Ansible profile_tasks Callback Plugin

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible
- Ansible callback plugins
- ansible.posix profile_tasks, profile_roles, and timer callbacks
- Ansible playbook profiling and async task polling
- YAML playbook snippets
- Bash command examples

## Sources Consulted
- Ansible Community Documentation: ansible.posix.profile_tasks callback - https://docs.ansible.com/projects/ansible/latest/collections/ansible/posix/profile_tasks_callback.html
- Ansible Community Documentation: Callback plugins - https://docs.ansible.com/projects/ansible/latest/plugins/callback.html
- Ansible Community Documentation: Ansible configuration settings - https://docs.ansible.com/projects/ansible/latest/reference_appendices/config.html
- Ansible Community Documentation: ansible.posix.profile_roles callback - https://docs.ansible.com/projects/ansible/latest/collections/ansible/posix/profile_roles_callback.html
- Ansible Community Documentation: ansible.posix.timer callback - https://docs.ansible.com/projects/ansible/latest/collections/ansible/posix/timer_callback.html
- Ansible Community Documentation: ansible.builtin.apt module - https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/apt_module.html
- Ansible Community Documentation: ansible.builtin.copy module - https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/copy_module.html
- Ansible Core Documentation: Asynchronous actions and polling - https://docs.ansible.com/projects/ansible-core/devel/playbook_guide/playbooks_async.html

## Issues Found
- The post used the older `callback_whitelist` setting and `ANSIBLE_CALLBACK_WHITELIST` environment variable. Current Ansible documentation uses `callbacks_enabled` and `ANSIBLE_CALLBACKS_ENABLED`, so the examples were updated.
- The post used the short callback names `profile_tasks`, `profile_roles`, and `timer` in current-version examples. Current docs identify these callbacks as part of the `ansible.posix` collection and recommend specifying the fully qualified names, so the examples were changed to `ansible.posix.profile_tasks`, `ansible.posix.profile_roles`, and `ansible.posix.timer`.
- The post did not mention that `ansible.posix.profile_tasks` is not included in `ansible-core`. Added a short note to install `ansible.posix` when using only `ansible-core`.
- The post described the parenthesized timing value on each timestamp line as the current task duration. Official docs define this value as the length of the previous task, so the explanation and sample output were corrected. The post now points readers to the end-of-run summary for each task's own duration.
- The sample output used `Thursday 21 February 2026`, but February 21, 2026 is a Saturday. Updated the sample weekday.
- The comparison command used a grep pattern that could miss valid task names beginning with lowercase letters. Replaced it with a summary-section extraction using `sed`.

## Review Notes
The local environment did not have `ansible-playbook` or `ansible-doc` installed, so command behavior was verified against official Ansible documentation rather than local CLI output.
