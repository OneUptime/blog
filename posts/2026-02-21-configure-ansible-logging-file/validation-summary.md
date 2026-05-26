# Validation Summary: How to Configure Ansible Logging to a File

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible configuration
- Ansible callback plugins
- Ansible playbook logging
- logrotate
- syslog/logger
- Bash scripting

## Sources Consulted
- Ansible Core documentation: Logging Ansible output - https://docs.ansible.com/projects/ansible-core/devel/reference_appendices/logging.html
- Ansible configuration settings - https://docs.ansible.com/projects/ansible/latest/reference_appendices/config.html
- Ansible callback plugins documentation - https://docs.ansible.com/projects/ansible/latest/plugins/callback.html
- ansible.posix.json callback documentation - https://docs.ansible.com/projects/ansible/latest/collections/ansible/posix/json_callback.html
- community.general.log_plays callback documentation - https://docs.ansible.com/projects/ansible/latest/collections/community/general/log_plays_callback.html
- Ansible plugin development documentation - https://docs.ansible.com/projects/ansible-core/2.16/dev_guide/developing_plugins.html
- Local `logrotate --help` output
- Local `logger --help` output

## Issues Found
- The JSON callback example used `stdout_callback = json`. Current Ansible documentation identifies this callback as `ansible.posix.json` and notes that it is provided by the `ansible.posix` collection, not `ansible-core`. Updated the snippet and added a short installation/check note.
- The `log_plays` example used the legacy `callback_whitelist` setting and an unqualified plugin name. Current Ansible configuration uses `callbacks_enabled`, and the documented current callback is `community.general.log_plays` from the `community.general` collection. Updated the configuration and surrounding text.
- The custom syslog callback used `CALLBACK_NEEDS_WHITELIST` and `callback_whitelist`, which are legacy names in current Ansible documentation. Updated them to `CALLBACK_NEEDS_ENABLED` and `callbacks_enabled`.
- The monitoring script could produce an empty `FAILURES` value when the log file was missing or not recently modified, causing a numeric comparison error. It also only matched uppercase `FAILED`, while Ansible failure indicators commonly include `FAILED!` and recap fields like `failed=1`. Updated the command to suppress missing-file noise, default empty results to `0`, and match both failure forms case-insensitively.

## Review Notes
The Ansible logging guidance is generally accurate. `ansible-playbook` was not installed in the local environment, so Ansible examples were verified against official documentation rather than by running a playbook locally.
