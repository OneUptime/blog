# Validation Summary: How to Use Ansible run_once with Delegation

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible playbooks
- `run_once`
- `delegate_to`
- `serial`
- Ansible built-in modules: `debug`, `shell`, `copy`, `systemd`, `uri`, `apt`, `template`
- YAML

## Sources Consulted
- Ansible Playbook Keywords: https://docs.ansible.com/projects/ansible/latest/reference_appendices/playbooks_keywords.html
- Ansible Core playbook execution strategies and `run_once`: https://docs.ansible.com/projects/ansible-core/devel/playbook_guide/playbooks_strategies.html
- Ansible delegation and local actions: https://docs.ansible.com/projects/ansible/7/playbook_guide/playbooks_delegation.html
- Ansible inventory patterns and group subscripts: https://docs.ansible.com/projects/ansible/latest/inventory_guide/intro_patterns.html
- `ansible.builtin.uri` module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/uri_module.html
- `ansible.builtin.copy` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/copy_module.html
- `ansible.builtin.systemd` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/systemd_module.html

## Issues Found
- The introduction and `run_once` explanation said the task runs only once regardless of the number of hosts in the play and that results apply to all hosts. Official Ansible documentation scopes `run_once` to the first host in the current batch and applies results/facts to active hosts in that batch. Updated the wording to use "current batch" and "all hosts in that batch."
- The first `delegate_to` example used `serial: 1` while claiming the delegated migration would run exactly once. With `serial`, Ansible runs `run_once` tasks once per serial batch, so `serial: 1` would run the migration once for each app server. Removed `serial: 1` from that example.
- The localhost delegation example used `serial: 2` while describing one-time notification/API tasks. With `serial: 2`, those tasks would run once per batch. Removed `serial: 2` from that example.
- The variable sharing section and summary said registered variables from `run_once` tasks are shared across all hosts in the play. Updated this to the documented active-batch behavior, noting that without `serial` this is all hosts in the play.

## Review Notes
- The remaining playbook snippets use current Ansible task keywords and fully qualified built-in module names. `ansible.builtin.systemd` is currently a documented redirect to `ansible.builtin.systemd_service`, so the examples remain valid.
- Ansible is not installed in this workspace, so examples were reviewed against official documentation rather than executed locally.
