# Validation Summary: How to Use the Ansible log_plays Callback Plugin

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible callback plugins
- community.general.log_plays callback
- Ansible configuration
- Unix shell commands
- logrotate
- syslog logger

## Sources Consulted
- Ansible Community Documentation: community.general.log_plays callback - https://docs.ansible.com/projects/ansible/latest/collections/community/general/log_plays_callback.html
- Ansible Core Documentation: Callback plugins - https://docs.ansible.com/projects/ansible-core/devel/plugins/callback.html
- Ansible Core Documentation: Configuration settings, CALLBACKS_ENABLED - https://docs.ansible.com/projects/ansible-core/devel/reference_appendices/config.html
- Ansible Core Documentation: ansible.builtin.default callback - https://docs.ansible.com/projects/ansible-core/devel/collections/ansible/builtin/default_callback.html
- Ansible Community Documentation: Callback plugin index - https://docs.ansible.com/projects/ansible/latest/collections/index_callback.html
- community.general source: log_plays.py - https://raw.githubusercontent.com/ansible-collections/community.general/main/plugins/callback/log_plays.py

## Issues Found
- The post used the older `callback_whitelist` and `ANSIBLE_CALLBACK_WHITELIST` settings. Updated examples to use current `callbacks_enabled` and `ANSIBLE_CALLBACKS_ENABLED`.
- The first `ansible.cfg` example used `log_path` for the per-host log directory. `log_path` is Ansible's general controller log file setting, while `log_plays` uses `[callback_log_plays] log_folder`. Updated the snippet.
- The post referred to `log_plays` as if it were available directly in ansible-core. Current documentation places it in the `community.general` collection and recommends using `community.general.log_plays`; added the collection install/check context and FQCN.
- The sample log lines used ISO timestamps, `TASK:` labels, and `CHANGED` as a result category. The plugin source writes lines as `<Mon DD YYYY HH:MM:SS> - <playbook> - <task> - <action> - <category> - <json result>`, and changed tasks are logged as `OK` with `"changed": true` in the JSON result. Updated examples and grep commands accordingly.
- The "Combining with Other Callbacks" snippet used the removed/deprecated `yaml` stdout callback style. Updated it to `ansible.builtin.default` with `callback_result_format = yaml`, and used FQCNs for the notification/aggregate callbacks.
- The cron rotation example claimed to archive logs older than 90 days but did not archive anything and used brittle date filtering. Replaced it with a simple archive-and-truncate script plus retention cleanup for archived `.gz` files.
- The logrotate example assumed an `ansible` user and group existed. Added a note to replace that owner with the account that runs `ansible-playbook`.
- The syslog example claimed to send new entries but did not track offsets and used an undefined `last_line_count`. Updated it to accurately send current log contents and quote the log path.

## Review Notes
The corrected post is accurate for current Ansible documentation as of 2026-05-27. I could not run `ansible-doc` locally because Ansible is not installed in this workspace, so plugin behavior was verified against official documentation and the upstream `community.general` plugin source.
