# Validation Summary: How to Use the Ansible default Callback Plugin

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible
- Ansible callback plugins
- Ansible configuration (`ansible.cfg`)
- Ansible playbook CLI options
- YAML and JSON result formatting

## Sources Consulted
- Ansible latest documentation: `ansible.builtin.default` callback plugin, https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/default_callback.html
- Ansible latest documentation: callback plugins, https://docs.ansible.com/projects/ansible-core/devel/plugins/callback.html
- Ansible latest documentation: `ansible.builtin.set_stats` module, https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/set_stats_module.html
- Ansible latest documentation: `ansible-playbook` CLI, https://docs.ansible.com/ansible/latest/cli/ansible-playbook.html
- Ansible latest documentation: `ansible.posix.json` callback plugin, https://docs.ansible.com/projects/ansible/latest/collections/ansible/posix/json_callback.html
- Ansible latest documentation: `ansible.posix.profile_tasks` callback plugin, https://docs.ansible.com/projects/ansible/latest/collections/ansible/posix/profile_tasks_callback.html
- Ansible latest documentation: `community.general.dense` callback plugin, https://docs.ansible.com/projects/ansible/latest/collections/community/general/dense_callback.html

## Issues Found
- The configuration example described `callback_result_format = yaml` as "Show task execution time." This option controls task result formatting, not timing. Changed the comment to "Format task result output."
- The post said default task results are displayed as Python dictionaries. Current Ansible documentation lists `callback_result_format = json` as the default for the default callback. Changed the description and comparison label to JSON format.
- The callback recommendations implied `profile_tasks` and `junit` are replacements for the default stdout callback. Ansible documents `profile_tasks` and `junit` as aggregate callbacks that run alongside a stdout callback. Updated those bullets to say they should be enabled as additional callbacks.
- The callback recommendations used short names for callbacks that now live outside `ansible-core`. Updated `json`, `dense`, and `profile_tasks` to their current documented FQCNs: `ansible.posix.json`, `community.general.dense`, and `ansible.posix.profile_tasks`.

## Review Notes
The `callback_result_format` option is available in ansible-core 2.13 and later. The default callback's JSON/YAML result formatting is for human-facing callback output and is interspersed with other playbook output; use a dedicated JSON stdout callback when the whole run output must be machine-parseable.
