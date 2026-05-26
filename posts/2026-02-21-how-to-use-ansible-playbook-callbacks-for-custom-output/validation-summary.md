# Validation Summary: How to Use Ansible Playbook Callbacks for Custom Output

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ansible callback plugins
- Ansible configuration
- Python callback plugin development
- Slack incoming webhooks
- JSON Lines logging

## Sources Consulted
- Ansible callback plugins documentation: https://docs.ansible.com/projects/ansible/latest/plugins/callback.html
- Ansible callback plugin index: https://docs.ansible.com/projects/ansible/latest/collections/index_callback.html
- Ansible stdout callback plugin index: https://docs.ansible.com/projects/ansible/latest/collections/callback_index_stdout.html
- ansible.builtin.default callback documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/default_callback.html
- ansible.posix.profile_tasks callback documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/posix/profile_tasks_callback.html
- ansible.posix.json callback documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/posix/json_callback.html
- community.general.yaml callback documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/general/yaml_callback.html
- Local installed ansible-core 2.21.0 Python package source for callback loading and CallbackBase behavior.

## Issues Found
- The stdout callback examples included old or incorrect callback names for current Ansible documentation. Replaced `actionable` with `minimal`, changed JSON output to `ansible.posix.json`, replaced aggregate callback examples under `stdout_callback` with valid stdout callbacks, and changed YAML output guidance to use `callback_result_format = yaml` with the default callback.
- The aggregate callbacks `timer`, `profile_tasks`, and `profile_roles` were shown without their current collection-qualified names. Updated the examples to `ansible.posix.timer`, `ansible.posix.profile_tasks`, and `ansible.posix.profile_roles`.
- The `profile_tasks` example used the short plugin name. Updated it to `ansible.posix.profile_tasks`, matching current official documentation.
- The custom callback examples used the old `CALLBACK_NEEDS_WHITELIST` attribute. Updated them to the current `CALLBACK_NEEDS_ENABLED` attribute.
- The Slack callback documented an `ansible.cfg` option for `webhook_url` but only read `SLACK_WEBHOOK_URL` from the environment. Updated `DOCUMENTATION` with a default and changed `set_options()` to read `self.get_option('webhook_url')`, so both the INI setting and environment variable work through Ansible's plugin option system.

## Review Notes
- The Python examples were syntax-checked with Python 3.12 after editing.
- The local environment has ansible-core available through Python but does not have the `ansible-doc` CLI command on PATH, so CLI output was verified against official documentation rather than local command execution.
