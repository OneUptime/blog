# Validation Summary: How to Configure Multiple Callback Plugins in Ansible

## Status
validated

## Post Type
Tutorial / Configuration guide

## Technologies Covered
- Ansible callback plugins
- Ansible configuration (`ansible.cfg`)
- Ansible environment variables
- `ansible.builtin`, `ansible.posix`, and `community.general` callback plugins

## Sources Consulted
- Ansible callback plugins documentation: https://docs.ansible.com/ansible/latest/plugins/callback.html
- Ansible configuration settings (`callbacks_enabled`, `stdout_callback`, callback paths): https://docs.ansible.com/projects/ansible/latest/reference_appendices/config.html
- Ansible stdout callback plugin index: https://docs.ansible.com/projects/ansible/latest/collections/callback_index_stdout.html
- Ansible aggregate callback plugin index: https://docs.ansible.com/projects/ansible/latest/collections/callback_index_aggregate.html
- `ansible.builtin.default` callback documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/default_callback.html
- `ansible.builtin.junit` callback documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/junit_callback.html
- `ansible.posix.timer` callback documentation: https://docs.ansible.com/ansible/latest/collections/ansible/posix/timer_callback.html
- `ansible.posix.profile_tasks` callback documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/posix/profile_tasks_callback.html
- `ansible.posix.profile_roles` callback documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/posix/profile_roles_callback.html
- `community.general.log_plays` callback documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/general/log_plays_callback.html
- `community.general.slack` callback documentation: https://docs.ansible.com/ansible/latest/collections/community/general/slack_callback.html
- `community.general.syslog_json` callback documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/general/syslog_json_callback.html
- `ansible.builtin.tree` callback documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/tree_callback.html

## Issues Found
- The post described only two callback types. Current Ansible documentation distinguishes stdout, aggregate, and notification callbacks, so the taxonomy and examples were updated.
- The post used `callback_whitelist` and `ANSIBLE_CALLBACK_WHITELIST`, which are older names. Current Ansible uses `callbacks_enabled` and `ANSIBLE_CALLBACKS_ENABLED`, so all examples were updated.
- The post used `stdout_callback = yaml`. The `community.general.yaml` stdout callback is deprecated and removed in newer `community.general` releases; Ansible's default callback now supports YAML-style result formatting through `callback_result_format = yaml`, so examples were updated to use `stdout_callback = default`.
- Several callback plugin names were unqualified old short names. Examples were updated to current FQCNs such as `ansible.posix.timer`, `ansible.posix.profile_tasks`, `ansible.builtin.junit`, and `community.general.log_plays`.
- The production stack referenced `community.general.syslog`, but the documented community callback is `community.general.syslog_json`. The example was corrected.
- The Slack example used a Jinja lookup expression inside `ansible.cfg`. Ansible callback configuration expects a literal config value or supported environment variable, so the example was changed to a literal placeholder webhook URL.
- The compliance stack recommended `ansible.builtin.tree` as a playbook callback output. Official documentation describes it as the callback used by the ad hoc `--tree` option, so that recommendation and the related output description were removed.
- The loading order section claimed a package/collection/project/path precedence model and name override behavior that is not supported by the callback plugin documentation. It was replaced with documented event and plugin file ordering behavior.
- Performance claims about microsecond overhead, Slack batching, and effectively zero overhead were too specific without documentation support. They were softened to accurate general guidance.
- The troubleshooting section referred to old whitelist terminology and called `timer` a notification callback. It now uses `callbacks_enabled` and identifies `timer` as an aggregate callback.

## Review Notes
`ansible-doc` is not installed in this workspace, so CLI verification was limited to official Ansible documentation rather than local command output.
