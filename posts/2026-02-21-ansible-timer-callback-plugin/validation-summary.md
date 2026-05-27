# Validation Summary: How to Use the Ansible timer Callback Plugin

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible callback plugins
- ansible.posix timer callback
- ansible.posix profile_tasks callback
- ansible.cfg configuration
- Bash scripting
- GitLab CI/CD YAML

## Sources Consulted
- Ansible callback plugins documentation: https://docs.ansible.com/projects/ansible/latest/plugins/callback.html
- Ansible configuration settings documentation: https://docs.ansible.com/projects/ansible/latest/reference_appendices/config.html
- ansible.posix.timer callback documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/posix/timer_callback.html
- ansible.posix.profile_tasks callback documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/posix/profile_tasks_callback.html
- ansible.builtin.default callback documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/default_callback.html
- ansible.posix timer callback source: https://raw.githubusercontent.com/ansible-collections/ansible.posix/main/plugins/callback/timer.py
- ansible.posix profile_tasks callback source: https://raw.githubusercontent.com/ansible-collections/ansible.posix/main/plugins/callback/profile_tasks.py

## Issues Found
- The post used the older `callback_whitelist` / `ANSIBLE_CALLBACK_WHITELIST` setting. Updated examples to current `callbacks_enabled` / `ANSIBLE_CALLBACKS_ENABLED`.
- The post referred to `timer` and `profile_tasks` as short callback names without noting their current collection location. Updated examples to use `ansible.posix.timer` and `ansible.posix.profile_tasks`, and added the required collection caveat.
- The post described timer as a notification callback. Updated it to aggregate callback, matching the plugin documentation and source.
- The sample output omitted timer's `PLAYBOOK RECAP` banner. Added the banner to output examples.
- The profile_tasks combination used `stdout_callback = yaml`, which is not the current recommended YAML-result configuration. Updated it to `callback_result_format = yaml`.
- The profile_tasks sample omitted its `TASKS RECAP` banner. Added it and ordered callbacks so profile_tasks output appears before timer output.
- The GitLab CI `awk` expression parsed the timer line incorrectly, treating minutes as hours and ignoring days and hours. Updated it to calculate seconds from days, hours, minutes, and seconds.
- The GitLab CI pipeline piped `ansible-playbook` through `tee` without preserving the playbook exit status. Added `set -o pipefail`.
- The source-inspection command imported the old in-core callback path. Updated it to import `ansible_collections.ansible.posix.plugins.callback.timer`.
- The internals section claimed the start time was recorded when the playbook begins and that the implementation was about 20 lines. Updated this to match the current source, where timing starts when the callback is initialized and is emitted when playbook stats are generated.
- The post claimed the callback adds no overhead. Changed this to negligible overhead for technical precision.

## Review Notes
Ansible was not installed in the local environment, so command execution was not tested locally. Verification was performed against current official Ansible documentation and the upstream ansible.posix callback source.
