# Validation Summary: How to Set Up Ansible Callback Whitelist

## Status
validated

## Post Type
Tutorial / configuration guide

## Technologies Covered
- Ansible callback plugins
- Ansible configuration via ansible.cfg
- Ansible callback-related environment variables
- Ansible collections: ansible.posix and community.general
- Python custom callback plugin example

## Sources Consulted
- Ansible callback plugin documentation: https://docs.ansible.com/projects/ansible/latest/plugins/callback.html
- Ansible configuration settings for callbacks_enabled and stdout_callback: https://docs.ansible.com/projects/ansible/latest/reference_appendices/config.html
- ansible.posix.timer callback documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/posix/timer_callback.html
- ansible.posix.profile_tasks callback documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/posix/profile_tasks_callback.html
- ansible.posix.profile_roles callback documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/posix/profile_roles_callback.html
- ansible.posix.json callback documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/posix/json_callback.html
- community.general.log_plays callback documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/general/log_plays_callback.html
- community.general.mail callback documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/general/mail_callback.html
- community.general.slack callback documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/general/slack_callback.html
- Ansible plugin development documentation for callback metadata: https://docs.ansible.com/projects/ansible-core/2.16/dev_guide/developing_plugins.html

## Issues Found
- The post used `callback_whitelist` as the primary current setting and said the rename happened in Ansible 2.15+. Official configuration docs show `callbacks_enabled` was added in Ansible 2.11 with environment variable `ANSIBLE_CALLBACKS_ENABLED`. I updated the guide to use `callbacks_enabled` and kept `callback_whitelist` only as an older-release compatibility note.
- Several examples used short callback names for plugins now documented in collections. I updated examples to use current FQCNs such as `ansible.posix.timer`, `ansible.posix.profile_tasks`, `ansible.posix.profile_roles`, `community.general.log_plays`, `community.general.mail`, and `community.general.slack`.
- The stdout examples used `yaml` and `json` as if they were current built-in callbacks. Current docs list JSON output as `ansible.posix.json`, and the old YAML callback is deprecated/absent from the current stdout callback index. I changed YAML examples to `default` output and the CI JSON example to `ansible.posix.json`.
- The mail callback description said it sends email when a playbook finishes or a task fails. Current community.general documentation describes it as reporting failure events, so I corrected the description.
- The custom callback used `CALLBACK_NEEDS_WHITELIST`, which has been replaced by `CALLBACK_NEEDS_ENABLED` in current callback plugin examples. I updated the metadata flag.
- The Python example used `datetime.utcnow()`, which is deprecated in modern Python. I changed it to `datetime.now(timezone.utc)` and verified the snippet compiles with Python 3.
- The sample `profile_tasks` output listed February 21, 2026 as Wednesday. That date is a Saturday, so I corrected the illustrative timestamp.
- The troubleshooting section only mentioned installing `community.general`. I added `ansible.posix` for the timer and profiling callbacks used throughout the post.

## Review Notes
The local environment did not have `ansible` or `ansible-doc` installed, so command behavior was verified against official Ansible documentation rather than local CLI output. The custom callback is syntactically valid Python, but it remains an illustrative example and was not executed inside Ansible.
