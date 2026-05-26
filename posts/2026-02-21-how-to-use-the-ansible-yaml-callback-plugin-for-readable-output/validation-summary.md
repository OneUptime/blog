# Validation Summary: How to Use the Ansible yaml Callback Plugin for Readable Output

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible
- Ansible callback plugins
- Ansible configuration
- YAML output formatting
- Ansible CLI options

## Sources Consulted
- Ansible documentation: `community.general.yaml` callback removal and replacement with `ansible.builtin.default` `result_format=yaml`: https://docs.ansible.com/projects/ansible/latest/collections/community/general/yaml_callback.html
- Ansible documentation: `ansible.builtin.default` callback options, including `callback_result_format` and `ANSIBLE_CALLBACK_RESULT_FORMAT`: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/default_callback.html
- Ansible documentation: callback plugin behavior, stdout callback limits, and `callbacks_enabled`: https://docs.ansible.com/projects/ansible/latest/plugins/callback.html
- Ansible documentation: `ansible.posix.timer` aggregate callback: https://docs.ansible.com/projects/ansible/latest/collections/ansible/posix/timer_callback.html
- Ansible documentation: `ansible.posix.profile_tasks` aggregate callback: https://docs.ansible.com/projects/ansible/latest/collections/ansible/posix/profile_tasks_callback.html
- Ansible documentation: `community.general.dense` stdout callback: https://docs.ansible.com/projects/ansible/latest/collections/community/general/dense_callback.html
- Ansible documentation: `ansible.posix.json` stdout callback: https://docs.ansible.com/projects/ansible/devel/collections/ansible/posix/json_callback.html
- Ansible documentation: `ansible-playbook` CLI, including `--diff` and `-v`: https://docs.ansible.com/projects/ansible/latest/cli/ansible-playbook.html

## Issues Found
- The post described enabling `stdout_callback = yaml` and `ANSIBLE_STDOUT_CALLBACK=yaml`. The `community.general.yaml` callback has been removed in current `community.general`; official docs state it was superseded by `result_format=yaml` in `ansible.builtin.default` from ansible-core 2.13 onward. Updated the post to use `stdout_callback = ansible.builtin.default`, `callback_result_format = yaml`, and `ANSIBLE_CALLBACK_RESULT_FORMAT=yaml`.
- The title, description, headings, and explanatory text referred to the removed standalone `yaml` callback plugin as the current approach. Updated wording to describe current YAML result formatting through the default stdout callback.
- The examples enabling `timer` and `profile_tasks` used short names. Updated them to `ansible.posix.timer` and `ansible.posix.profile_tasks` to match current collection documentation and avoid ambiguity.
- The compact-output example used `ANSIBLE_STDOUT_CALLBACK=dense`. Updated it to `ANSIBLE_STDOUT_CALLBACK=community.general.dense`, the current documented FQCN.
- The machine-readable output example used `ANSIBLE_STDOUT_CALLBACK=json`. Updated it to `ANSIBLE_STDOUT_CALLBACK=ansible.posix.json`, the documented JSON stdout callback.

## Review Notes
The YAML-formatted examples are illustrative rather than guaranteed byte-for-byte Ansible output. Official docs note that `callback_result_format=yaml` formats task results within Ansible's normal human-oriented output and does not make the entire playbook output a valid standalone YAML document.
