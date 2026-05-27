# Validation Summary: How to Use the Ansible json Callback Plugin

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible callback plugins
- ansible.posix JSON stdout callback
- Ansible configuration
- Bash
- jq
- Python
- Jenkins Pipeline

## Sources Consulted
- Ansible Community Documentation: ansible.posix.json callback - https://docs.ansible.com/projects/ansible/latest/collections/ansible/posix/json_callback.html
- Ansible Community Documentation: Callback plugins - https://docs.ansible.com/projects/ansible/latest/plugins/callback.html
- Ansible Community Documentation: Index of all stdout callback plugins - https://docs.ansible.com/projects/ansible/latest/collections/callback_index_stdout.html
- Ansible Community Documentation: ansible.posix.profile_tasks callback - https://docs.ansible.com/projects/ansible/latest/collections/ansible/posix/profile_tasks_callback.html
- Ansible Community Documentation: community.general.mail callback - https://docs.ansible.com/projects/ansible/latest/collections/community/general/mail_callback.html
- Ansible posix collection source: json callback implementation - https://raw.githubusercontent.com/ansible-collections/ansible.posix/main/plugins/callback/json.py

## Issues Found
- The post referred to the callback as `json` without noting that the current documented plugin is `ansible.posix.json` from the `ansible.posix` collection and is not included in `ansible-core`. Added the install command and updated examples to use the fully qualified callback name.
- The post said the callback suppresses all output. Updated this to clarify that normal stdout task output is suppressed, but warnings and errors may still appear on stderr.
- The sample output omitted the `path` fields and the trailing `Z` UTC suffix that the current callback source includes in play/task metadata. Updated the sample structure.
- The post described `custom_stats` and `global_custom_stats` as always containing `set_stats` data. Updated this to note that they are populated when `show_custom_stats` is enabled.
- CI and Jenkins examples redirected stderr into the JSON file with `2>&1`, which can corrupt the JSON if warnings or errors are emitted. Updated those examples to keep stderr in a separate log file.
- The large-output section described `jq -c` as streaming. Updated the wording because `-c` produces compact output, not streaming parsing.
- The additional callback example used deprecated `callback_whitelist` and combined JSON output with aggregate callbacks that can write extra text to stdout. Updated it to use `callbacks_enabled` with a configured notification callback and added a caveat about aggregate callbacks.

## Review Notes
Ansible was not installed in the local workspace, so `ansible-doc` and live playbook execution could not be used for verification. The review was completed against current official Ansible documentation and the `ansible.posix` callback source.
