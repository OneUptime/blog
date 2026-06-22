# Validation Summary: How to Implement Ansible Callbacks

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ansible callback plugins
- Ansible configuration (`ansible.cfg`)
- Ansible collections (`ansible.builtin`, `ansible.posix`, `community.general`)
- Python callback plugin development
- Slack webhooks
- StatsD metrics
- Syslog logging

## Sources Consulted
- Ansible callback plugin documentation: https://docs.ansible.com/projects/ansible/latest/plugins/callback.html
- Ansible callback plugin index: https://docs.ansible.com/projects/ansible/latest/collections/index_callback.html
- `ansible.builtin.default` callback documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/default_callback.html
- `ansible.posix.timer` callback documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/posix/timer_callback.html
- `ansible.posix.profile_tasks` callback documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/posix/profile_tasks_callback.html
- `ansible.posix.json` callback documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/posix/json_callback.html
- `community.general.dense` callback documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/general/dense_callback.html
- `community.general.log_plays` callback documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/general/log_plays_callback.html
- `community.general.syslog_json` callback documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/general/syslog_json_callback.html
- Ansible configuration settings reference: https://docs.ansible.com/projects/ansible/latest/reference_appendices/config.html

## Issues Found
- The YAML callback examples used `stdout_callback = yaml`, but the current supported configuration is `stdout_callback = ansible.builtin.default` with `callback_result_format = yaml`. Updated the examples to use the current `ansible.builtin.default` callback configuration.
- Several callback examples used short names for callbacks that live in collections. Updated examples to use FQCNs such as `ansible.posix.timer`, `ansible.posix.profile_tasks`, `ansible.posix.json`, `community.general.dense`, `community.general.log_plays`, and `community.general.syslog_json`.
- The log callback example combined `community.general.log_plays` with the global `log_path` setting. `log_plays` writes one file per host under its `log_folder` option, so the example now uses `[callback_log_plays] log_folder = /var/log/ansible/hosts`.
- The syslog callback example used `SYSLOG_FACILITY=LOG_USER`, while the callback option expects facility names such as `user`. Updated it to `SYSLOG_FACILITY=user`.
- The custom callback examples used `CALLBACK_NEEDS_WHITELIST`, an older naming pattern. Updated the examples to use `NEEDS_ENABLED = True`, matching current Ansible callback documentation.
- The post stated that Ansible includes all listed callbacks. Updated the wording to clarify that some callbacks are provided by commonly installed collections rather than `ansible-core`.

## Review Notes
The Python examples were syntax-checked with Python 3.12 by compiling the three Python code blocks extracted from the Markdown. The examples still use `requests`, Slack incoming webhook payloads, and StatsD as illustrative integrations; users need those dependencies and endpoint credentials in their controller environment.
