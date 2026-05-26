# Validation Summary: How to Use the run_once Directive in Ansible

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ansible playbooks
- Ansible `run_once`
- Ansible `serial`
- Ansible task delegation with `delegate_to`
- Ansible registered variables and conditionals
- YAML

## Sources Consulted
- Ansible Community Documentation: Controlling playbook execution: strategies and more - https://docs.ansible.com/ansible/latest/playbook_guide/playbooks_strategies.html
- Ansible Community Documentation: Controlling where tasks run: delegation and local actions - https://docs.ansible.com/ansible/latest/playbook_guide/playbooks_delegation.html
- Ansible Lint Documentation: run-once rule - https://docs.ansible.com/projects/lint/rules/run-once/

## Issues Found
- The post described `run_once` as operating across all hosts in the play. Official Ansible documentation states that `run_once` runs on the first host in the current batch and applies results and facts to hosts in that same batch. I updated the affected wording to use "current batch" and clarified that results are applied to other hosts in the batch.
- The "truly run once across serial batches" example used `when: ansible_play_batch | first == inventory_hostname`, which is true for the first host of every serial batch and would still run once per batch. I changed it to `when: inventory_hostname == ansible_play_hosts_all[0]`, matching Ansible's documented pattern for running only once regardless of `serial`.

## Review Notes
- The examples use short module names such as `copy`, `command`, `uri`, and `systemd`. These remain valid in Ansible playbooks, though fully qualified collection names such as `ansible.builtin.copy` are often preferred in stricter style guides.
- Ansible lint warns that `run_once` can behave unexpectedly with the `free` strategy. The post does not discuss `strategy: free`; this is a useful future caveat but not a correctness issue for the examples shown.
