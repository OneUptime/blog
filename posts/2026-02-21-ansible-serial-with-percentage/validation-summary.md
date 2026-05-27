# Validation Summary: How to Use Ansible Serial with Percentage

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ansible playbooks
- Ansible `serial`
- Ansible `max_fail_percentage`
- Ansible magic variables
- GitHub Actions workflow syntax
- YAML

## Sources Consulted
- Ansible documentation: Controlling playbook execution with `serial` - https://docs.ansible.com/ansible/latest/playbook_guide/playbooks_strategies.html
- Ansible documentation: Error handling and `max_fail_percentage` - https://docs.ansible.com/ansible/latest/playbook_guide/playbooks_error_handling.html
- Ansible documentation: Special variables (`ansible_play_batch`, `ansible_play_hosts`, `ansible_play_hosts_all`) - https://docs.ansible.com/ansible/latest/reference_appendices/special_variables.html
- Ansible source: `pct_to_int` percentage conversion helper - https://github.com/ansible/ansible/blob/stable-2.17/lib/ansible/utils/helpers.py
- Ansible documentation: `ansible.builtin.uri` module - https://docs.ansible.com/ansible/latest/collections/ansible/builtin/uri_module.html

## Issues Found
- The rounding section said Ansible rounds percentage calculations. Ansible converts percentage batch sizes with integer truncation, with a minimum of 1 for positive percentages. Updated the wording and examples to say "truncates."
- The `max_fail_percentage` explanation double-counted failures in the blast-radius example and did not call out that the threshold must be exceeded, not equaled. Updated the explanation so a 20-host batch with `max_fail_percentage: 10` stops after more than 2 failures, and clarified that the current batch is the rollout blast radius before later batches are aborted.
- The capacity assertion used `ansible_play_hosts`, which is not limited by `serial`. Replaced it with `ansible_play_batch`, the magic variable for the current serial batch.
- The progress example treated `ansible_play_batch` as a batch number, but it is a list of hosts in the current batch. Updated the example to report the current batch size and a completion percentage based on `ansible_play_hosts_all`, `ansible_play_hosts`, and `ansible_play_batch`.

## Review Notes
Short module names such as `copy`, `service`, `uri`, and `include_role` remain valid in Ansible playbooks, though fully qualified collection names are often preferred in newer examples for clarity. The post does not pin an Ansible version; the reviewed behavior matches current Ansible documentation and the Ansible percentage conversion helper.
