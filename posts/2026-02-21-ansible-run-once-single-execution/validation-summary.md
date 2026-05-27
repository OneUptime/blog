# Validation Summary: How to Use Ansible run_once for Single Execution Tasks

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible playbooks
- Ansible `run_once`
- Ansible `serial`
- Ansible `delegate_to`
- Ansible `throttle`
- Ansible built-in modules: `apt`, `command`, `service`, `uri`, `get_url`, `git`, `debug`, `fetch`, `copy`
- `community.general.slack`

## Sources Consulted
- Ansible Community Documentation: Controlling playbook execution, strategies, and `run_once`: https://docs.ansible.com/ansible/latest/playbook_guide/playbooks_strategies.html
- Ansible Community Documentation: Playbook keywords for `run_once`, `delegate_to`, `serial`, `throttle`, `register`, and `when`: https://docs.ansible.com/ansible/latest/reference_appendices/playbooks_keywords.html
- Ansible Community Documentation: Delegation and local actions: https://docs.ansible.com/ansible/latest/playbook_guide/playbooks_delegation.html
- Ansible Community Documentation: `ansible.builtin.uri` module: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/uri_module.html
- Ansible Community Documentation: `ansible.builtin.fetch` module: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/fetch_module.html
- Ansible Community Documentation: `community.general.slack` module: https://docs.ansible.com/ansible/latest/collections/community/general/slack_module.html

## Issues Found
- The post said the basic `run_once` example runs on the first host in the inventory. Ansible documents `run_once` as running on the first host available in the current batch, so this was changed to "first host in the current batch."
- The post said to combine `run_once` with `delegate_to` to run truly once across all serial batches. Ansible documents that `run_once` still runs once per serial batch, and recommends a `when: inventory_hostname == ansible_play_hosts_all[0]` guard when a task must run only once regardless of `serial`. The text and example were updated accordingly.
- The `run_once` versus `throttle: 1` guidance said `run_once` should be used when a task should execute exactly once. This was narrowed to "once for the current batch," with a note to add a host-specific `when` guard for plays using `serial`.

## Review Notes
The Ansible module examples are syntactically plausible and use current module options. The Slack example uses `community.general.slack`, which is part of the `community.general` collection and may require that collection to be installed when using `ansible-core` rather than the full Ansible package.
