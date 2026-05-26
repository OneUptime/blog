# Validation Summary: How to Use Ansible Callback Plugins for CI/CD Reporting

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible callback plugins
- Ansible configuration (`ansible.cfg`)
- `ansible.posix` callback collection
- CI/CD pipeline reporting
- GitHub Actions
- Python callback plugin development
- Slack incoming webhook notifications
- JSON parsing with `jq`

## Sources Consulted
- Ansible callback plugins documentation: https://docs.ansible.com/ansible/latest/plugins/callback.html
- Ansible configuration settings, including `callbacks_enabled`: https://docs.ansible.com/ansible/latest/reference_appendices/config.html
- Ansible default callback documentation, including `callback_result_format`: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/default_callback.html
- `ansible.posix.json` callback documentation: https://docs.ansible.com/ansible/latest/collections/ansible/posix/json_callback.html
- `ansible.posix.profile_tasks` callback documentation: https://docs.ansible.com/ansible/latest/collections/ansible/posix/profile_tasks_callback.html
- `ansible.posix.timer` callback documentation: https://docs.ansible.com/ansible/latest/collections/ansible/posix/timer_callback.html
- `ansible.posix.profile_roles` callback documentation: https://docs.ansible.com/ansible/latest/collections/ansible/posix/profile_roles_callback.html
- Ansible plugin development documentation for callback plugins: https://docs.ansible.com/ansible/latest/dev_guide/developing_plugins.html#callback-plugins

## Issues Found
- Replaced deprecated `callback_whitelist` guidance with current `callbacks_enabled` usage.
- Updated built-in callback examples to use current `ansible.posix` fully qualified callback names for `timer`, `profile_tasks`, `profile_roles`, and `json`, and added a note that these callbacks require the `ansible.posix` collection when using `ansible-core`.
- Replaced outdated `stdout_callback = yaml` examples with `stdout_callback = default` plus `callback_result_format = yaml`, because current Ansible documents YAML as a result formatting option on the default callback rather than a machine-readable YAML stdout callback.
- Updated the JSON pipeline example to use `ANSIBLE_STDOUT_CALLBACK=ansible.posix.json` and avoid mixing stderr into the JSON output file.
- Replaced `CALLBACK_NEEDS_WHITELIST` with current `CALLBACK_NEEDS_ENABLED` in custom callback examples.
- Removed the Python 2 `urllib2` fallback from the Slack example and used Python 3 `urllib.request`, matching current Ansible runtime expectations.
- Wrapped Slack webhook delivery in exception handling so a notification delivery failure does not break the callback example.

## Review Notes
Local `ansible --version` verification was not possible because Ansible is not installed in this workspace, so validation was performed against current official Ansible documentation. The post is technically accurate after the changes, with the caveat that users running only `ansible-core` must install the `ansible.posix` collection for the documented callbacks.
