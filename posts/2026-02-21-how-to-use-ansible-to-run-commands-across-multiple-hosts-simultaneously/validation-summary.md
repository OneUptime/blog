# Validation Summary: How to Use Ansible to Run Commands Across Multiple Hosts Simultaneously

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible playbooks
- Ansible ad-hoc commands
- Ansible forks
- Ansible strategy plugins
- Ansible `serial`, `async`, `poll`, and `throttle`
- Ansible callback plugins

## Sources Consulted
- Ansible configuration settings: https://docs.ansible.com/projects/ansible/latest/reference_appendices/config.html
- Ansible `ansible-playbook` CLI documentation: https://docs.ansible.com/projects/ansible/latest/cli/ansible-playbook.html
- Ansible `ansible` CLI documentation: https://docs.ansible.com/projects/ansible/latest/cli/ansible.html
- Ansible `linear` strategy documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/linear_strategy.html
- Ansible `free` strategy documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/free_strategy.html
- Ansible playbook error handling and `max_fail_percentage`: https://docs.ansible.com/ansible/latest/playbook_guide/playbooks_error_handling.html
- Ansible asynchronous actions and polling: https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbooks_async.html
- Ansible loop and retry behavior: https://docs.ansible.com/ansible/latest/playbook_guide/playbooks_loops.html
- Ansible callback plugins: https://docs.ansible.com/projects/ansible/latest/plugins/callback.html
- Ansible POSIX callback plugin index: https://docs.ansible.com/projects/ansible/latest/collections/ansible/posix/index.html
- Ansible `ansible.posix.profile_tasks` callback documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/posix/profile_tasks_callback.html

## Issues Found
- The rolling deployment health check used `retries` and `delay` without `until`. Older Ansible versions force `retries` to 1 unless `until` is set, so the example would not reliably retry. Added `register: health_check` and `until: health_check.status == 200`.
- The callback configuration used the older `callback_whitelist` setting and short callback names. Current Ansible documentation uses `callbacks_enabled`, and the timer/profile callbacks are documented in the `ansible.posix` collection. Updated the snippet to use `callbacks_enabled = ansible.posix.timer, ansible.posix.profile_tasks, ansible.posix.profile_roles`.

## Review Notes
- The post is technically relevant and the remaining examples align with current Ansible documentation.
- `ansible.posix` callbacks may already be installed with the full `ansible` package, but they are not included in `ansible-core` alone.
